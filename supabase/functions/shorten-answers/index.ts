import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ANSWER_LENGTH = 20;
const BATCH_SIZE = 10;

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  category_id: string;
}

interface AnswerShortenResult {
  id: string;
  questionText: string;
  originalCorrect: string;
  shortenedCorrect: string | null;
  originalIncorrect: string[];
  shortenedIncorrect: (string | null)[];
  status: 'shortened' | 'partially_shortened' | 'unshortenable' | 'failed';
  correctShortened: boolean;
  incorrectShortenedCount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, inProduction } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for questions that need answer shortening
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id")
      .eq("is_active", true)
      .is("answer_shorten_status", null);

    // Filter by production status
    if (inProduction !== undefined) {
      query = query.eq("in_production", inProduction);
    }

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    const { data: allQuestions, error: fetchError } = await query;
    
    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      throw fetchError;
    }

    // Filter to questions with long answers
    const questionsWithLongAnswers = (allQuestions || []).filter((q) => {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) 
        ? q.incorrect_answers as string[]
        : [];
      
      const correctTooLong = q.correct_answer.length > MAX_ANSWER_LENGTH;
      const anyIncorrectTooLong = incorrectAnswers.some(a => a.length > MAX_ANSWER_LENGTH);
      
      return correctTooLong || anyIncorrectTooLong;
    });

    const limit = testMode ? Math.min(5, questionsWithLongAnswers.length) : BATCH_SIZE;
    const questionsToProcess = questionsWithLongAnswers.slice(0, limit);

    if (questionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          done: true,
          processed: 0,
          shortened: 0,
          partiallyShortened: 0,
          unshortenable: 0,
          failed: 0,
          remaining: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: AnswerShortenResult[] = [];
    let shortened = 0;
    let partiallyShortened = 0;
    let unshortenable = 0;
    let failed = 0;

    // Process questions one by one
    for (const question of questionsToProcess) {
      try {
        const incorrectAnswers = Array.isArray(question.incorrect_answers) 
          ? question.incorrect_answers as string[]
          : [];

        // Identify which answers need shortening
        const correctNeedsShortening = question.correct_answer.length > MAX_ANSWER_LENGTH;
        const incorrectNeedShortening = incorrectAnswers.map(a => a.length > MAX_ANSWER_LENGTH);
        const anyNeedsShortening = correctNeedsShortening || incorrectNeedShortening.some(Boolean);

        if (!anyNeedsShortening) {
          // Mark as already OK
          await supabase
            .from("questions")
            .update({ answer_shorten_status: "shortened" })
            .eq("id", question.id);
          continue;
        }

        // Build the prompt for AI
        const answersToShorten: { type: string; answer: string; index?: number }[] = [];
        
        if (correctNeedsShortening) {
          answersToShorten.push({ type: 'correct', answer: question.correct_answer });
        }
        
        incorrectAnswers.forEach((ans, idx) => {
          if (ans.length > MAX_ANSWER_LENGTH) {
            answersToShorten.push({ type: 'incorrect', answer: ans, index: idx });
          }
        });

        const prompt = `შენ ხარ ქართული ქვიზის პასუხების შემოკლების ექსპერტი.

ამოცანა: შეამოკლე პასუხები ${MAX_ANSWER_LENGTH} სიმბოლომდე.

წესები:
1. შეინარჩუნე ზუსტად იგივე მნიშვნელობა
2. გამოიყენე სწორი ქართული გრამატიკა
3. არ დაკარგო მნიშვნელოვანი ინფორმაცია
4. თუ შემოკლება შეუძლებელია, დაწერე: CANNOT_SHORTEN

კითხვა (კონტექსტისთვის): "${question.question_text}"

პასუხები შესამოკლებლად:
${answersToShorten.map((a, i) => `${i + 1}. "${a.answer}" (${a.answer.length} → ${MAX_ANSWER_LENGTH})`).join('\n')}

პასუხი JSON ფორმატში:
{
  "shortened": [
    {"original": "...", "shortened": "..." ან "CANNOT_SHORTEN"}
  ]
}`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log("Rate limited, marking as failed for retry");
            results.push({
              id: question.id,
              questionText: question.question_text,
              originalCorrect: question.correct_answer,
              shortenedCorrect: null,
              originalIncorrect: incorrectAnswers,
              shortenedIncorrect: incorrectAnswers.map(() => null),
              status: 'failed',
              correctShortened: false,
              incorrectShortenedCount: 0,
            });
            failed++;
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        let aiResponse = data.choices?.[0]?.message?.content?.trim() || "";

        // Parse JSON response
        let parsedResponse: { shortened: Array<{ original: string; shortened: string }> } | null = null;
        
        try {
          // Extract JSON from response (may have markdown code blocks)
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error("Failed to parse AI response:", aiResponse);
        }

        if (!parsedResponse || !parsedResponse.shortened) {
          // Failed to get valid response
          results.push({
            id: question.id,
            questionText: question.question_text,
            originalCorrect: question.correct_answer,
            shortenedCorrect: null,
            originalIncorrect: incorrectAnswers,
            shortenedIncorrect: incorrectAnswers.map(() => null),
            status: 'failed',
            correctShortened: false,
            incorrectShortenedCount: 0,
          });
          failed++;
          continue;
        }

        // Process AI results
        let newCorrectAnswer = question.correct_answer;
        let newIncorrectAnswers = [...incorrectAnswers];
        let correctWasShortened = false;
        let incorrectShortenedCount = 0;
        let anyUnshortenable = false;

        for (let i = 0; i < answersToShorten.length; i++) {
          const item = answersToShorten[i];
          const aiResult = parsedResponse.shortened[i];
          
          if (!aiResult) continue;

          const shortenedText = aiResult.shortened;
          const isUnshortenable = shortenedText === "CANNOT_SHORTEN" || 
                                  shortenedText.includes("CANNOT_SHORTEN") ||
                                  shortenedText.length > MAX_ANSWER_LENGTH;

          if (isUnshortenable) {
            anyUnshortenable = true;
          } else if (shortenedText && shortenedText.length <= MAX_ANSWER_LENGTH) {
            if (item.type === 'correct') {
              newCorrectAnswer = shortenedText;
              correctWasShortened = true;
            } else if (item.index !== undefined) {
              newIncorrectAnswers[item.index] = shortenedText;
              incorrectShortenedCount++;
            }
          }
        }

        // Determine status
        let status: AnswerShortenResult['status'];
        const totalNeeded = answersToShorten.length;
        const totalShortened = (correctWasShortened ? 1 : 0) + incorrectShortenedCount;

        if (totalShortened === totalNeeded && !anyUnshortenable) {
          status = 'shortened';
          shortened++;
        } else if (totalShortened > 0) {
          status = 'partially_shortened';
          partiallyShortened++;
        } else {
          status = 'unshortenable';
          unshortenable++;
        }

        // Update database
        await supabase
          .from("questions")
          .update({
            correct_answer: newCorrectAnswer,
            incorrect_answers: newIncorrectAnswers,
            answer_shorten_status: status,
            original_correct_answer: question.correct_answer,
            original_incorrect_answers: incorrectAnswers,
          })
          .eq("id", question.id);

        results.push({
          id: question.id,
          questionText: question.question_text,
          originalCorrect: question.correct_answer,
          shortenedCorrect: correctWasShortened ? newCorrectAnswer : null,
          originalIncorrect: incorrectAnswers,
          shortenedIncorrect: newIncorrectAnswers.map((ans, idx) => 
            ans !== incorrectAnswers[idx] ? ans : null
          ),
          status,
          correctShortened: correctWasShortened,
          incorrectShortenedCount,
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        results.push({
          id: question.id,
          questionText: question.question_text,
          originalCorrect: question.correct_answer,
          shortenedCorrect: null,
          originalIncorrect: Array.isArray(question.incorrect_answers) ? question.incorrect_answers as string[] : [],
          shortenedIncorrect: [],
          status: 'failed',
          correctShortened: false,
          incorrectShortenedCount: 0,
        });
        failed++;
      }
    }

    const remaining = questionsWithLongAnswers.length - questionsToProcess.length;

    return new Response(
      JSON.stringify({
        done: remaining === 0 || testMode,
        processed: questionsToProcess.length,
        shortened,
        partiallyShortened,
        unshortenable,
        failed,
        remaining,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in shorten-answers function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
