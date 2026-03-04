import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_ANSWER_LENGTH = 20;
const AGGRESSIVE_THRESHOLD = 12;
const BATCH_SIZE = 10;
const SENTENCE_LENGTH_THRESHOLD = 30;

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  category_id: string;
  language: string;
}

interface AnswerShortenResult {
  id: string;
  questionText: string;
  originalCorrect: string;
  shortenedCorrect: string | null;
  originalIncorrect: string[];
  shortenedIncorrect: (string | null)[];
  status: 'shortened' | 'partially_shortened' | 'unshortenable' | 'failed' | 'needs_rewrite';
  correctShortened: boolean;
  incorrectShortenedCount: number;
}

/**
 * Detect if an answer looks like a full sentence rather than a quiz answer.
 * Checks for verb-like patterns, multiple spaces, and length.
 */
function looksLikeSentence(answer: string): boolean {
  if (answer.length < SENTENCE_LENGTH_THRESHOLD) return false;
  
  const wordCount = answer.trim().split(/\s+/).length;
  if (wordCount < 4) return false;
  
  // Common sentence patterns: contains verbs, conjunctions, articles in sequence
  const sentencePatterns = [
    /\b(is|are|was|were|has|have|had|does|did|can|could|will|would|should|may|might)\b/i,
    /\b(because|therefore|however|although|which|that|when|where|while)\b/i,
    /\b(reduces|increases|causes|creates|provides|ensures|prevents|allows|enables)\b/i,
  ];
  
  const matchCount = sentencePatterns.filter(p => p.test(answer)).length;
  return matchCount >= 1 && wordCount >= 5;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, inProduction, aggressiveMode, language, questionIds } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const threshold = aggressiveMode ? AGGRESSIVE_THRESHOLD : MAX_ANSWER_LENGTH;

    // Build query for questions that need answer shortening
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id, language")
      .eq("is_active", true);

    // In aggressive mode, also re-process already-shortened answers that are still > threshold
    if (aggressiveMode) {
      query = query.or("answer_shorten_status.is.null,answer_shorten_status.eq.shortened");
    } else {
      query = query.is("answer_shorten_status", null);
    }

    // Filter by language if specified
    if (language && language !== "all") {
      query = query.eq("language", language);
    }

    // Filter by production status
    if (inProduction !== undefined) {
      query = query.eq("in_production", inProduction);
    }

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Filter by specific question IDs if provided
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in("id", questionIds);
    }

    // Paginated fetch to handle 7000+ rows (Supabase default limit is 1000)
    let allQuestions: any[] = [];
    let page = 0;
    const FETCH_PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await query.range(page * FETCH_PAGE_SIZE, (page + 1) * FETCH_PAGE_SIZE - 1);
      if (fetchError) {
        console.error("Error fetching questions:", fetchError);
        throw fetchError;
      }
      if (data && data.length > 0) allQuestions.push(...data);
      if (!data || data.length < FETCH_PAGE_SIZE) hasMore = false;
      page++;
    }

    // Filter to questions with long answers
    const questionsWithLongAnswers = (allQuestions || []).filter((q) => {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) 
        ? q.incorrect_answers as string[]
        : [];
      
      const correctTooLong = q.correct_answer.length > threshold;
      const anyIncorrectTooLong = incorrectAnswers.some(a => a.length > threshold);
      
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
          needsRewrite: 0,
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
    let needsRewrite = 0;
    let failed = 0;

    // Process questions one by one
    for (const question of questionsToProcess) {
      try {
        const incorrectAnswers = Array.isArray(question.incorrect_answers) 
          ? question.incorrect_answers as string[]
          : [];

        // Check if any answers look like full sentences → use enhanced rewrite prompt
        const allAnswers = [question.correct_answer, ...incorrectAnswers];
        const hasSentenceAnswers = allAnswers.some(a => looksLikeSentence(a));
        const useSentenceRewritePrompt = hasSentenceAnswers;

        // Identify which answers need shortening
        const correctNeedsShortening = question.correct_answer.length > threshold;
        const incorrectNeedShortening = incorrectAnswers.map(a => a.length > threshold);
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
          if (ans.length > threshold) {
            answersToShorten.push({ type: 'incorrect', answer: ans, index: idx });
          }
        });

        const isGeorgian = question.language === 'ka';
        const isEnglish = question.language === 'en';

        let prompt: string;

        if (isGeorgian) {
          prompt = `შენ ხარ ქართული ქვიზის პასუხების შემოკლების ექსპერტი.

ამოცანა: შეამოკლე პასუხები ${MAX_ANSWER_LENGTH} სიმბოლომდე ისე, რომ მნიშვნელობა არ დაიკარგოს.

🚫 რას არ უნდა აკეთო:
- არ მოაჭრა სიტყვები ნახევარზე (მაგ. "აღმაშენებელი" → "აღმაშენებ" არასწორია!)
- არ შეამოკლო საკუთარი სახელები და გვარები (მაგ. "დავით IV აღმაშენებელი", "ალექსანდრე მაკედონელი")
- არ შეამოკლო ისტორიული პიროვნებების სახელები და ტიტულები
- არ შეამოკლო გეოგრაფიული სახელები
- არ გამოიყენო აბრევიატურები თუ არ არის საყოველთაოდ ცნობილი

✅ რა შეიძლება:
- წაშალე ზედმეტი სიტყვები ("ეს არის", "რომელიც", "და ა.შ.")
- გამოიყენე სინონიმური მოკლე სიტყვა
- გადააფორმულირე უფრო ლაკონურად

⚠️ მნიშვნელოვანი:
- თუ პასუხი არის საკუთარი სახელი, გვარი, ან ისტორიული პიროვნება - ის ვერ შემოკლდება
- თუ შემოკლება შეუძლებელია ზემოთ ჩამოთვლილი მიზეზებით, უპასუხე: CANNOT_SHORTEN
- უმჯობესია დატოვო გრძელი პასუხი ვიდრე დაამახინჯო

კითხვა (კონტექსტისთვის): "${question.question_text}"

პასუხები შესამოკლებლად:
${answersToShorten.map((a, i) => `${i + 1}. "${a.answer}" (${a.answer.length} სიმბოლო)`).join('\n')}

პასუხი მხოლოდ JSON ფორმატში:
{
  "shortened": [
    {"original": "...", "shortened": "..." ან "CANNOT_SHORTEN"}
  ]
}`;
        } else {
          // Enhanced English prompt (also used as default for other languages)
          if (useSentenceRewritePrompt) {
            prompt = `You are a trivia quiz answer shortening expert. These answers are FULL SENTENCES that need to be converted into concise quiz button labels (max ${MAX_ANSWER_LENGTH} characters).

CRITICAL: The output MUST be in English. Do NOT translate answers into any other language.

Task: Extract the KEY CONCEPT from each sentence answer and turn it into a short quiz button label (max ${MAX_ANSWER_LENGTH} characters).

✅ GOOD transformations (learn from these):
- "It reduces the learning rate gradually" → "Reduces learning rate"
- "The process of photosynthesis occurs" → "Photosynthesis"
- "Carbon dioxide is released into the atmosphere" → "CO₂ released"
- "The model overfits to the outliers, leading to poor generalization" → "Overfits outliers"
- "Gradient explosion or vanishing occurs, preventing effective learning" → "Gradient explosion"
- "Adversarial perturbations are spontaneously generated within the model" → "Adversarial generation"
- "It increases the number of parameters significantly" → "More parameters"
- "The algorithm converges to a local minimum" → "Local minimum"

🚫 Do NOT:
- Keep the full sentence — extract the core concept only
- Truncate words (e.g., "Alexander" → "Alexand" is WRONG)
- Use obscure abbreviations
- Change the factual meaning

⚠️ Rules:
- EVERY answer MUST be shortened to ≤${MAX_ANSWER_LENGTH} chars — no exceptions for sentences
- Extract the noun phrase or key concept that makes this answer unique
- If truly impossible without losing all meaning → CANNOT_SHORTEN`;
          } else {
            prompt = `You are a trivia quiz answer shortening expert. Your goal: make answers fit on mobile quiz buttons (max ${MAX_ANSWER_LENGTH} characters).

CRITICAL: The output MUST be in English. Do NOT translate answers into any other language. Only shorten - do not change the language.

Task: Shorten each answer to max ${MAX_ANSWER_LENGTH} characters. These are quiz answer OPTIONS, not explanations.

✅ GOOD shortenings (learn from these):
- "The United Kingdom" → "United Kingdom" (drop articles)
- "Consumer Price Index" → "CPI" (use well-known abbreviations)
- "The Pacific Ocean" → "Pacific Ocean"
- "Carbon Dioxide" → "CO₂"
- "United States of America" → "USA"
- "It is a type of mammal" → "Mammal" (extract the key term)
- "Mount Kilimanjaro" → "Mt. Kilimanjaro"
- "Approximately 365 days" → "365 days"
- "The color blue" → "Blue"
- "During the Renaissance" → "Renaissance"

🚫 Do NOT:
- Truncate words (e.g., "Alexander" → "Alexand" is WRONG)
- Change proper nouns (names of people, places)
- Use obscure abbreviations
- Change the factual meaning

✅ Shortening strategies (in order of preference):
1. Drop articles: "The", "A", "An"
2. Drop filler: "It is", "That is", "Known as", "Called the"
3. Use well-known abbreviations: USA, UK, EU, DNA, CPI, GDP, NATO, UN, WHO, CO₂
4. Remove unnecessary qualifiers: "approximately", "roughly", "about", "around"
5. Use shorter synonyms if exact meaning preserved
6. Extract the key noun/term from a phrase

⚠️ Rules:
- If the answer is a proper noun that's already minimal (e.g., "Leonardo da Vinci") → CANNOT_SHORTEN
- If shortening would lose critical meaning → CANNOT_SHORTEN
- Better to keep it long than to distort it`;
          }

Question (for context): "${question.question_text}"

Answers to shorten:
${answersToShorten.map((a, i) => `${i + 1}. "${a.answer}" (${a.answer.length} chars)`).join('\n')}

Respond ONLY in JSON:
{
  "shortened": [
    {"original": "...", "shortened": "..." or "CANNOT_SHORTEN"}
  ]
}`;
        }

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

        // Georgian character detection guard for English questions
        const georgianPattern = /[\u10A0-\u10FF]/;
        if (question.language === 'en' && parsedResponse.shortened.some(s => georgianPattern.test(s.shortened))) {
          console.log(`Question ${question.id}: English answers got Georgian output, marking as failed`);
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

        // Direct Apply mode: write shortened answers directly, archive originals
        const updatePayload: Record<string, any> = {
          answer_shorten_status: status,
          original_correct_answer: question.correct_answer,
          original_incorrect_answers: incorrectAnswers,
        };

        if (correctWasShortened) {
          updatePayload.correct_answer = newCorrectAnswer;
        }
        if (incorrectShortenedCount > 0) {
          updatePayload.incorrect_answers = newIncorrectAnswers;
        }

        await supabase
          .from("questions")
          .update(updatePayload)
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
        needsRewrite,
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
