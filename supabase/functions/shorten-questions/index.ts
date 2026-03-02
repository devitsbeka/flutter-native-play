import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_LENGTH = 67; // Unified with UI constant
const MIN_LENGTH = 15;
const MIN_WORDS = 3;
const BATCH_SIZE = 10;

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  category_id: string;
  language: string;
}

interface ShortenResult {
  id: string;
  original: string;
  shortened: string | null;
  status: 'shortened' | 'unshortenable' | 'failed' | 'answer_in_question';
  originalLength: number;
  newLength: number | null;
  qualityIssue?: string;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Validate shortened question quality - simplified, less strict
function isValidShortenedQuestion(shortened: string, original: string, language: string = 'en'): ValidationResult {
  const trimmed = shortened.trim();
  
  if (trimmed.length < MIN_LENGTH) {
    return { valid: false, reason: `Too short (${trimmed.length} < ${MIN_LENGTH})` };
  }
  
  // Must end with question mark
  const cleanedEnd = trimmed.replace(/[\s'"'""]+$/, '');
  if (!trimmed.endsWith('?') && !cleanedEnd.endsWith('?')) {
    return { valid: false, reason: 'Missing question mark' };
  }
  
  // Must have at least MIN_WORDS words
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < MIN_WORDS) {
    return { valid: false, reason: `Too few words (${words.length} < ${MIN_WORDS})` };
  }
  
  // Check for nonsense
  const uniqueChars = new Set(trimmed.replace(/\s/g, '').split(''));
  if (uniqueChars.size < 5) {
    return { valid: false, reason: 'Nonsense text' };
  }
  
  return { valid: true };
}

// Check if answer text appears in question
function hasAnswerInQuestion(questionText: string, correctAnswer: string): boolean {
  const normalizedQuestion = questionText.toLowerCase().replace(/[?!.,]/g, '').trim();
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[?!.,]/g, '').trim();
  
  if (normalizedCorrect.length >= 4 && normalizedQuestion.includes(normalizedCorrect)) {
    return true;
  }
  
  const answerWords = normalizedCorrect.split(/\s+/);
  if (answerWords.length >= 2) {
    const partialAnswer = answerWords.slice(0, 2).join(' ');
    if (partialAnswer.length >= 6 && normalizedQuestion.includes(partialAnswer)) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, inProduction, language } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for questions that need shortening
    let baseQuery = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id, language")
      .eq("is_active", true)
      .is("shorten_status", null);

    if (inProduction !== undefined) {
      baseQuery = baseQuery.eq("in_production", inProduction);
    }
    if (categoryId && categoryId !== "all") {
      baseQuery = baseQuery.eq("category_id", categoryId);
    }
    if (language && language !== "all") {
      baseQuery = baseQuery.eq("language", language);
    }

    // Paginated fetch
    let allQuestions: any[] = [];
    let page = 0;
    const FETCH_PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await baseQuery.range(page * FETCH_PAGE_SIZE, (page + 1) * FETCH_PAGE_SIZE - 1);
      if (fetchError) throw fetchError;
      if (data && data.length > 0) allQuestions.push(...data);
      if (!data || data.length < FETCH_PAGE_SIZE) hasMore = false;
      page++;
    }

    // Filter by length
    const longQuestions = allQuestions.filter(q => q.question_text.length > MAX_LENGTH);

    const limit = testMode ? Math.min(5, longQuestions.length) : BATCH_SIZE;
    const questionsToProcess = longQuestions.slice(0, limit);

    if (questionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ done: true, processed: 0, shortened: 0, unshortenable: 0, failed: 0, remaining: 0, results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ShortenResult[] = [];
    let shortened = 0;
    let unshortenable = 0;
    let failed = 0;

    for (const question of questionsToProcess) {
      try {
        const incorrectAnswers = Array.isArray(question.incorrect_answers) 
          ? question.incorrect_answers as string[] : [];
        
        if (hasAnswerInQuestion(question.question_text, question.correct_answer)) {
          await supabase
            .from("questions")
            .update({ 
              shorten_status: "needs_rewrite",
              quality_status: "needs_rewrite",
              quality_issues: JSON.stringify(["answer_in_question"]),
              last_quality_check: new Date().toISOString(),
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id, original: question.question_text, shortened: null,
            status: 'answer_in_question', originalLength: question.question_text.length, newLength: null,
          });
          unshortenable++;
          continue;
        }

        const isGeorgian = question.language === 'ka';
        const charsOver = question.question_text.length - MAX_LENGTH;
        const isBorderline = charsOver <= 15;
        
        // Better prompt for borderline questions
        const borderlineHint = isBorderline 
          ? `\n\nIMPORTANT: This question is only ${charsOver} characters over the limit. You just need to trim ${charsOver} characters. Minor changes like removing articles, using abbreviations, or shortening phrases will work. Do NOT say CANNOT_SHORTEN for such small reductions.`
          : '';
        
        const prompt = isGeorgian
          ? `შენ ხარ ქართული ქვიზის კითხვების შემოკლების ექსპერტი.

ამოცანა: შეამოკლე კითხვა ${MAX_LENGTH} სიმბოლომდე.

მკაცრი წესები:
1. შეინარჩუნე კითხვის სრული აზრი და კონტექსტი
2. მინიმუმ ${MIN_LENGTH} სიმბოლო
3. მინიმუმ ${MIN_WORDS} სიტყვა
4. კითხვა უნდა დამთავრდეს კითხვის ნიშნით (?)
5. კითხვა უნდა იყოს სრულყოფილი და გასაგები
6. გამოიყენე სწორი ქართული გრამატიკა
7. არ გადათარგმნო ინგლისურად! მხოლოდ შეამოკლე ქართულად.${borderlineHint}

სწორი პასუხი (რეფერენსისთვის): "${question.correct_answer}"

თუ შემოკლება ${MAX_LENGTH} სიმბოლომდე შეუძლებელია სრული აზრის შენარჩუნებით, უპასუხე მხოლოდ: CANNOT_SHORTEN

ორიგინალი კითხვა: "${question.question_text}"
სიგრძე: ${question.question_text.length} → მაქსიმუმ ${MAX_LENGTH}

შემოკლებული კითხვა:`
          : `You are a quiz question shortening expert.

CRITICAL: The output MUST be in English. Do NOT translate to any other language. Only shorten.

Task: Shorten the question to max ${MAX_LENGTH} characters.

Rules:
1. Preserve the full meaning and context
2. Minimum ${MIN_LENGTH} characters
3. At least ${MIN_WORDS} words
4. Must end with question mark (?)
5. Must be complete and understandable without context
6. Use correct English grammar
7. Output MUST be English — never translate to another language${borderlineHint}

Correct answer (for reference): "${question.correct_answer}"

If shortening to ${MAX_LENGTH} characters is impossible while preserving meaning, respond only with: CANNOT_SHORTEN

Original question: "${question.question_text}"
Length: ${question.question_text.length} → max ${MAX_LENGTH}

Shortened question:`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log("Rate limited, marking as failed for retry");
            results.push({
              id: question.id, original: question.question_text, shortened: null,
              status: 'failed', originalLength: question.question_text.length, newLength: null,
            });
            failed++;
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        let aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
        
        // Clean up AI response - remove quotes if wrapped
        if ((aiResponse.startsWith('"') && aiResponse.endsWith('"')) || 
            (aiResponse.startsWith("'") && aiResponse.endsWith("'"))) {
          aiResponse = aiResponse.slice(1, -1);
        }

        console.log(`Question ${question.id}: "${aiResponse}" (${aiResponse.length} chars, was ${question.question_text.length})`);

        if (aiResponse === "CANNOT_SHORTEN" || aiResponse.includes("CANNOT_SHORTEN")) {
          await supabase
            .from("questions")
            .update({ shorten_status: "unshortenable", original_question_text: question.question_text })
            .eq("id", question.id);
          results.push({
            id: question.id, original: question.question_text, shortened: null,
            status: 'unshortenable', originalLength: question.question_text.length, newLength: null,
          });
          unshortenable++;
        } else if (aiResponse.length > MAX_LENGTH) {
          await supabase
            .from("questions")
            .update({ shorten_status: "unshortenable", original_question_text: question.question_text })
            .eq("id", question.id);
          results.push({
            id: question.id, original: question.question_text, shortened: aiResponse,
            status: 'unshortenable', originalLength: question.question_text.length, newLength: aiResponse.length,
            qualityIssue: `Still too long (${aiResponse.length} > ${MAX_LENGTH})`
          });
          unshortenable++;
        } else if (aiResponse.length > 0) {
          // Georgian character guard for English questions
          const georgianPattern = /[\u10A0-\u10FF]/;
          if (question.language === 'en' && georgianPattern.test(aiResponse)) {
            console.log(`Question ${question.id}: English got Georgian output, marking as failed`);
            results.push({
              id: question.id, original: question.question_text, shortened: aiResponse,
              status: 'failed', originalLength: question.question_text.length, newLength: aiResponse.length,
              qualityIssue: 'AI translated to Georgian instead of shortening'
            });
            failed++;
            continue;
          }

          const validation = isValidShortenedQuestion(aiResponse, question.question_text, question.language);
          
          if (!validation.valid) {
            console.log(`Question ${question.id}: Failed validation - ${validation.reason}`);
            await supabase
              .from("questions")
              .update({ shorten_status: "unshortenable", original_question_text: question.question_text })
              .eq("id", question.id);
            results.push({
              id: question.id, original: question.question_text, shortened: aiResponse,
              status: 'unshortenable', originalLength: question.question_text.length, newLength: aiResponse.length,
              qualityIssue: validation.reason
            });
            unshortenable++;
          } else {
            // DIRECT APPLY: Update question_text directly, save original for undo
            await supabase
              .from("questions")
              .update({ 
                question_text: aiResponse,
                shorten_status: "shortened",
                original_question_text: question.question_text,
                // Clear any stale pending data
                pending_question_text: null,
              })
              .eq("id", question.id);

            results.push({
              id: question.id, original: question.question_text, shortened: aiResponse,
              status: 'shortened', originalLength: question.question_text.length, newLength: aiResponse.length,
            });
            shortened++;
          }
        } else {
          console.log(`Question ${question.id}: Empty AI response`);
          results.push({
            id: question.id, original: question.question_text, shortened: null,
            status: 'failed', originalLength: question.question_text.length, newLength: null,
          });
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        results.push({
          id: question.id, original: question.question_text, shortened: null,
          status: 'failed', originalLength: question.question_text.length, newLength: null,
        });
        failed++;
      }
    }

    const remaining = longQuestions.length - questionsToProcess.length;

    return new Response(
      JSON.stringify({ done: remaining === 0 || testMode, processed: questionsToProcess.length, shortened, unshortenable, failed, remaining, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in shorten-questions function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
