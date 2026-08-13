import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";
import { rejectAnswerSet } from "../_shared/answerQuality.ts";

const MAX_ANSWER_LENGTH = 20;
const AGGRESSIVE_THRESHOLD = 12;
const BATCH_SIZE = 10;

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
  /** Why a proposed set was rejected, so the studio can show it. */
  qualityIssue?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { categoryId, testMode, inProduction, aggressiveMode, language, questionIds } = body;
    
    console.log("=== SHORTEN-ANSWERS REQUEST ===", JSON.stringify({
      categoryId, inProduction, aggressiveMode, language,
      questionIds: questionIds?.length || 0,
    }));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const threshold = aggressiveMode ? AGGRESSIVE_THRESHOLD : MAX_ANSWER_LENGTH;

    // Build query
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id, language")
      .eq("is_active", true);

    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      // No status filter for explicitly selected questions
    } else if (aggressiveMode) {
      query = query.or("answer_shorten_status.is.null,answer_shorten_status.eq.shortened");
    } else {
      query = query.is("answer_shorten_status", null);
    }

    if (language && language !== "all") query = query.eq("language", language);
    if (inProduction !== undefined) query = query.eq("in_production", inProduction);
    if (categoryId && categoryId !== "all") query = query.eq("category_id", categoryId);
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      query = query.in("id", questionIds);
    }

    // Paginated fetch
    let allQuestions: any[] = [];
    let page = 0;
    const FETCH_PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await query.range(page * FETCH_PAGE_SIZE, (page + 1) * FETCH_PAGE_SIZE - 1);
      if (fetchError) throw fetchError;
      if (data && data.length > 0) allQuestions.push(...data);
      if (!data || data.length < FETCH_PAGE_SIZE) hasMore = false;
      page++;
    }

    console.log(`Fetched ${allQuestions.length} questions`);

    // Filter to questions with any long answer
    const questionsWithLongAnswers = allQuestions.filter((q) => {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [];
      return q.correct_answer.length > threshold || incorrectAnswers.some(a => a.length > threshold);
    });

    console.log(`${questionsWithLongAnswers.length} questions have long answers (threshold: ${threshold})`);

    const limit = testMode ? Math.min(5, questionsWithLongAnswers.length) : BATCH_SIZE;
    const questionsToProcess = questionsWithLongAnswers.slice(0, limit);

    if (questionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ done: true, processed: 0, shortened: 0, partiallyShortened: 0, unshortenable: 0, needsRewrite: 0, failed: 0, remaining: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: AnswerShortenResult[] = [];
    let shortened = 0, partiallyShortened = 0, unshortenable = 0, failed = 0;

    for (const question of questionsToProcess) {
      try {
        const incorrectAnswers = Array.isArray(question.incorrect_answers) ? question.incorrect_answers as string[] : [];
        const isGeorgian = question.language === 'ka';

        const systemPrompt = isGeorgian
          ? `შენ ხარ ქვიზის პასუხების რედაქტორი. კითხვა და 4 პასუხი მოგეცემა. გადაწერე ყველა პასუხი მოკლე, მაღალხარისხოვან ქვიზის ღილაკის ლეიბლებად (მაქს ${MAX_ANSWER_LENGTH} სიმბოლო).

წესები:
- ყველა 4 პასუხი უნდა იყოს ≤${MAX_ANSWER_LENGTH} სიმბოლო
- პასუხები უნდა იყოს მსგავსი სიგრძისა და სტილის (დაბალანსებული)
- ფაქტობრივი სიზუსტე შეინარჩუნე
- ამოიღე საკვანძო კონცეფციები წინადადებებიდან
- არ მოაჭრა სიტყვები ნახევარზე
- თუ პასუხი უკვე კარგი და მოკლეა — დატოვე უცვლელად`
          : `You are a trivia quiz answer editor. Given a question and its 4 answer options, rewrite ALL answers as short, high-quality quiz button labels (max ${MAX_ANSWER_LENGTH} chars each).

HOW TO SHORTEN. In order, prefer:
1. Drop words the question already said. "How many chambers does a heart have?" → "Four chambers" becomes "Four".
2. Drop hedges and filler: "About", "Approximately", "It is", "This is", "generally".
3. Drop a leading article: "The Trojan Horse" → "Trojan Horse".
4. Keep the distinguishing noun and cut the rest of the sentence. "Humans have a low fat-to-muscle ratio, making them inefficient prey" → "Too little body fat".

NEVER:
- Never invent an abbreviation. "Foundation" → "Fdn", "Stock Exchange" → "Stk Exch", "Council" → "Cncl" and "Noise-induced hearing loss" → "Noise-induced H.L." are all WRONG. Only abbreviations a reader already knows without being told are allowed: USA, DNA, NASA, CO₂, WHO. If it will not fit without inventing one, drop a qualifier instead and let the answer be longer.
- Never truncate a word. "Alexander" → "Alexand" is WRONG.
- Never rename a proper noun to make it fit. A book, person, place or brand keeps its real name even if that means exceeding ${MAX_ANSWER_LENGTH}: "Philosophical Investigations" stays, it does not become "Philosophical Studies".
- Never change which answer is correct, and never make a distractor true.

BALANCE. The correct answer must NOT be the longest. Players pick the long one without reading. If the correct answer is a name you cannot shorten, lengthen the distractors to match instead — "William Butler Yeats" against "T.S. Eliot" should become "William Butler Yeats" against "Thomas Stearns Eliot".

Answers should be similar in length and style. If an answer is already short and good, keep it exactly as-is. Output must be in the SAME LANGUAGE as the input.`;

        const userPrompt = `Question: "${question.question_text}"
Correct answer: "${question.correct_answer}"
Incorrect 1: "${incorrectAnswers[0] || ''}"
Incorrect 2: "${incorrectAnswers[1] || ''}"
Incorrect 3: "${incorrectAnswers[2] || ''}"`;

        const response = await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel("google/gemini-2.5-flash"),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "submit_shortened_answers",
                description: "Submit the shortened versions of all 4 quiz answers",
                parameters: {
                  type: "object",
                  properties: {
                    correct: { type: "string", description: "Shortened correct answer (max 20 chars)" },
                    incorrect: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of 3 shortened incorrect answers (each max 20 chars)",
                      minItems: 3,
                      maxItems: 3,
                    },
                  },
                  required: ["correct", "incorrect"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "submit_shortened_answers" } },
            max_tokens: 300,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log(`Rate limited on question ${question.id}`);
            failed++;
            results.push(makeFailResult(question, incorrectAnswers));
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract tool call arguments
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || toolCall.function.name !== "submit_shortened_answers") {
          console.error(`No valid tool call for question ${question.id}`);
          failed++;
          results.push(makeFailResult(question, incorrectAnswers));
          continue;
        }

        let parsed: { correct: string; incorrect: string[] };
        try {
          parsed = JSON.parse(toolCall.function.arguments);
        } catch {
          console.error(`Failed to parse tool call args for ${question.id}`);
          failed++;
          results.push(makeFailResult(question, incorrectAnswers));
          continue;
        }

        // Strict per-answer language consistency guard
        const georgianPattern = /[\u10A0-\u10FF]/;
        const latinPattern = /[a-zA-Z]/;
        const allOutputs = [parsed.correct, ...parsed.incorrect];
        
        if (question.language === 'en') {
          // English questions: NO Georgian characters allowed in ANY answer
          const georgianAnswers = allOutputs.filter(s => georgianPattern.test(s));
          if (georgianAnswers.length > 0) {
            console.log(`Question ${question.id}: English got ${georgianAnswers.length} Georgian answer(s), rejecting ALL: ${JSON.stringify(georgianAnswers)}`);
            failed++;
            results.push(makeFailResult(question, incorrectAnswers));
            continue;
          }
        } else if (question.language === 'ka') {
          // Georgian questions: ALL answers must contain Georgian, reject if any is Latin-only
          const latinOnlyAnswers = allOutputs.filter(s => !georgianPattern.test(s) && latinPattern.test(s));
          if (latinOnlyAnswers.length > 0) {
            console.log(`Question ${question.id}: Georgian got ${latinOnlyAnswers.length} Latin-only answer(s), rejecting ALL: ${JSON.stringify(latinOnlyAnswers)}`);
            failed++;
            results.push(makeFailResult(question, incorrectAnswers));
            continue;
          }
        }

        // The set is accepted or rejected as a whole. Taking the model's new
        // text for some options and keeping the original for others is how a
        // half-shortened set appears — and a set where the correct answer is
        // the only long one left is a worse question than the one we started
        // with, because the answer can now be picked without reading it.
        const setRejection = rejectAnswerSet(
          question.correct_answer,
          incorrectAnswers,
          parsed.correct,
          parsed.incorrect,
        );
        if (setRejection) {
          console.log(`Question ${question.id}: rejected — ${setRejection}`);
          failed++;
          results.push(makeFailResult(question, incorrectAnswers, setRejection));
          continue;
        }

        const newCorrect = parsed.correct;
        const correctWasShortened = newCorrect !== question.correct_answer;
        const newIncorrect = parsed.incorrect;
        const incorrectShortenedCount = newIncorrect.filter((ans, idx) => ans !== incorrectAnswers[idx]).length;

        // Check if ALL long answers were actually shortened
        const correctStillLong = newCorrect.length > threshold;
        const anyIncorrectStillLong = newIncorrect.some(a => a.length > threshold);
        const totalChanged = (correctWasShortened ? 1 : 0) + incorrectShortenedCount;

        let status: AnswerShortenResult['status'];
        if (!correctStillLong && !anyIncorrectStillLong) {
          status = 'shortened';
          shortened++;
        } else if (totalChanged > 0) {
          status = 'partially_shortened';
          partiallyShortened++;
        } else {
          status = 'unshortenable';
          unshortenable++;
        }

        // Direct Apply: write to DB, archive originals
        const updatePayload: Record<string, any> = {
          answer_shorten_status: status,
          original_correct_answer: question.correct_answer,
          original_incorrect_answers: incorrectAnswers,
          correct_answer: newCorrect,
          incorrect_answers: newIncorrect,
        };

        await supabase.from("questions").update(updatePayload).eq("id", question.id);

        results.push({
          id: question.id,
          questionText: question.question_text,
          originalCorrect: question.correct_answer,
          shortenedCorrect: correctWasShortened ? newCorrect : null,
          originalIncorrect: incorrectAnswers,
          shortenedIncorrect: newIncorrect.map((ans, idx) => ans !== incorrectAnswers[idx] ? ans : null),
          status,
          correctShortened: correctWasShortened,
          incorrectShortenedCount,
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        const incorrectAnswers = Array.isArray(question.incorrect_answers) ? question.incorrect_answers as string[] : [];
        results.push(makeFailResult(question, incorrectAnswers));
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
        needsRewrite: 0,
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

function makeFailResult(
  question: any,
  incorrectAnswers: string[],
  qualityIssue?: string,
): AnswerShortenResult {
  return {
    id: question.id,
    questionText: question.question_text,
    originalCorrect: question.correct_answer,
    shortenedCorrect: null,
    originalIncorrect: incorrectAnswers,
    shortenedIncorrect: incorrectAnswers.map(() => null),
    status: 'failed',
    correctShortened: false,
    incorrectShortenedCount: 0,
    qualityIssue,
  };
}

