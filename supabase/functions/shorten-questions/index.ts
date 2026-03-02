import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_LENGTH = 65;
const MIN_LENGTH = 15; // Minimum characters for a valid shortened question
const MIN_WORDS = 3;   // Minimum word count
const MIN_REDUCTION_RATIO = 0.15; // Shortened must be at least 15% of original
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
  reasonGe?: string;
}

// Validate shortened question quality
function isValidShortenedQuestion(shortened: string, original: string, language: string = 'en'): ValidationResult {
  const trimmed = shortened.trim();
  
  // Must have minimum length
  if (trimmed.length < MIN_LENGTH) {
    return { 
      valid: false, 
      reason: 'too_short', 
      reasonGe: `ძალიან მოკლეა (${trimmed.length} < ${MIN_LENGTH} სიმბოლო)` 
    };
  }
  
  // Must end with question mark (handle trailing quotes/whitespace)
  const cleanedEnd = trimmed.replace(/[\s'"'""]+$/, '');
  if (!trimmed.endsWith('?') && !cleanedEnd.endsWith('?')) {
    return { 
      valid: false, 
      reason: 'no_question_mark', 
      reasonGe: 'არ მთავრდება კითხვის ნიშნით (?)' 
    };
  }
  
  // Must have at least MIN_WORDS words
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < MIN_WORDS) {
    return { 
      valid: false, 
      reason: 'too_few_words', 
      reasonGe: `ძალიან ცოტა სიტყვაა (${words.length} < ${MIN_WORDS})` 
    };
  }
  
  // Shortened version should be at least 25% of original (prevents massive info loss)
  if (trimmed.length < original.length * MIN_REDUCTION_RATIO) {
    return { 
      valid: false, 
      reason: 'too_much_reduction', 
      reasonGe: `ძალიან ბევრი ინფორმაცია დაიკარგა (${Math.round(trimmed.length / original.length * 100)}% < ${MIN_REDUCTION_RATIO * 100}%)` 
    };
  }
  
  // Check for incomplete sentences (particles/prepositions that shouldn't end a sentence)
  const lastWord = words[words.length - 1].replace('?', '').toLowerCase();
  const kaIncompleteEndings = ['რომ', 'რო', 'და', 'თუ', 'რა', 'ან', 'მაგრამ', 'ამიტომ', 'რადგან', 'როცა', 'სანამ', 'თუმცა'];
  const enIncompleteEndings = ['and', 'but', 'or', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'that', 'which', 'who', 'whose', 'whom'];
  const incompleteEndings = language === 'ka' ? kaIncompleteEndings : enIncompleteEndings;
  if (incompleteEndings.includes(lastWord)) {
    return { 
      valid: false, 
      reason: 'incomplete_sentence', 
      reasonGe: `Incomplete sentence (ends with: "${lastWord}")` 
    };
  }
  
  // Check if the shortened version is just repeated characters or nonsense
  const uniqueChars = new Set(trimmed.replace(/\s/g, '').split(''));
  if (uniqueChars.size < 5) {
    return { 
      valid: false, 
      reason: 'nonsense_text', 
      reasonGe: 'უაზრო ტექსტი (ძალიან ცოტა უნიკალური სიმბოლო)' 
    };
  }
  
  return { valid: true };
}

// Check if answer text appears in question
function hasAnswerInQuestion(questionText: string, correctAnswer: string, incorrectAnswers: string[]): boolean {
  const normalizedQuestion = questionText.toLowerCase().replace(/[?!.,]/g, '').trim();
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[?!.,]/g, '').trim();
  
  // Check if correct answer (or significant part) appears in question
  if (normalizedCorrect.length >= 4 && normalizedQuestion.includes(normalizedCorrect)) {
    return true;
  }
  
  // Check for partial match (first 2 words if answer is multi-word)
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
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id, language")
      .eq("is_active", true)
      .is("shorten_status", null);

    // Filter by production status
    if (inProduction !== undefined) {
      query = query.eq("in_production", inProduction);
    }

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Filter by language if specified
    if (language && language !== "all") {
      query = query.eq("language", language);
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

    // Filter by length in code (Supabase doesn't support LENGTH in queries easily)
    const longQuestions = (allQuestions || []).filter(
      (q) => q.question_text.length > MAX_LENGTH
    );

    const limit = testMode ? Math.min(5, longQuestions.length) : BATCH_SIZE;
    const questionsToProcess = longQuestions.slice(0, limit);

    if (questionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          done: true,
          processed: 0,
          shortened: 0,
          unshortenable: 0,
          failed: 0,
          remaining: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ShortenResult[] = [];
    let shortened = 0;
    let unshortenable = 0;
    let failed = 0;

    // Process questions one by one to avoid overwhelming the AI
    for (const question of questionsToProcess) {
      try {
        // First check for answer-in-question issue
        const incorrectAnswers = Array.isArray(question.incorrect_answers) 
          ? question.incorrect_answers as string[]
          : [];
        
        if (hasAnswerInQuestion(question.question_text, question.correct_answer, incorrectAnswers)) {
          // Mark as needs review due to answer in question
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
            id: question.id,
            original: question.question_text,
            shortened: null,
            status: 'answer_in_question',
            originalLength: question.question_text.length,
            newLength: null,
            qualityIssue: 'პასუხი შეიცავს კითხვის ტექსტს'
          });
          unshortenable++;
          continue;
        }

        const isGeorgian = question.language === 'ka';
        
        const prompt = isGeorgian
          ? `შენ ხარ ქართული ქვიზის კითხვების შემოკლების ექსპერტი.

ამოცანა: შეამოკლე კითხვა ${MAX_LENGTH} სიმბოლომდე.

მკაცრი წესები:
1. შეინარჩუნე კითხვის სრული აზრი და კონტექსტი
2. მინიმუმ ${MIN_LENGTH} სიმბოლო უნდა იყოს
3. მინიმუმ ${MIN_WORDS} სიტყვა უნდა შეიცავდეს
4. კითხვა უნდა დამთავრდეს კითხვის ნიშნით (?)
5. კითხვა უნდა იყოს სრულყოფილი და გასაგები კონტექსტის გარეშე
6. არ დატოვო წინადადება ნახევრად - ყველა სიტყვას უნდა ჰქონდეს აზრი
7. გამოიყენე სწორი ქართული გრამატიკა

არასწორი მაგალითები (ასე არ გააკეთო):
❌ "რო?" - არასრული, უაზრო
❌ "რომელი?" - არ აქვს კონტექსტი  
❌ "რა და რომელი?" - არ არის გასაგები
❌ "რომელ ქვეყანაში რომ?" - არასრული წინადადება

სწორი მაგალითები:
✅ "რომელი ქალაქია საქართველოს დედაქალაქი?"
✅ "ვინ დაწერა "ვეფხისტყაოსანი"?"
✅ "რა წელს დაარსდა გაერო?"

სწორი პასუხი (რეფერენსისთვის): "${question.correct_answer}"

თუ შემოკლება ${MAX_LENGTH} სიმბოლომდე შეუძლებელია სრული აზრის შენარჩუნებით, უპასუხე მხოლოდ: CANNOT_SHORTEN

ორიგინალი კითხვა: "${question.question_text}"
სიგრძე: ${question.question_text.length} → მაქსიმუმ ${MAX_LENGTH}

შემოკლებული კითხვა:`
          : `You are a quiz question shortening expert.

CRITICAL: The output MUST be in English. Do NOT translate the question into any other language. Only shorten - do not change the language.

Task: Shorten the question to max ${MAX_LENGTH} characters.

Strict rules:
1. Preserve the full meaning and context of the question
2. Minimum ${MIN_LENGTH} characters
3. Must contain at least ${MIN_WORDS} words
4. Must end with a question mark (?)
5. Must be a complete, understandable question without additional context
6. Do not leave sentences incomplete - every word must contribute meaning
7. Use correct English grammar
8. The output language MUST be English - never translate to another language

Bad examples (do NOT do this):
❌ "What?" - incomplete, meaningless
❌ "Which one?" - no context
❌ "What and which?" - not understandable

Good examples:
✅ "What is the capital of France?"
✅ "Who wrote Romeo and Juliet?"
✅ "What year was the UN founded?"

Correct answer (for reference): "${question.correct_answer}"

If shortening to ${MAX_LENGTH} characters is impossible while preserving full meaning, respond only with: CANNOT_SHORTEN

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
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log("Rate limited, marking as failed for retry");
            results.push({
              id: question.id,
              original: question.question_text,
              shortened: null,
              status: 'failed',
              originalLength: question.question_text.length,
              newLength: null,
            });
            failed++;
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";

        console.log(`Question ${question.id}: AI response = "${aiResponse}" (${aiResponse.length} chars)`);

        if (aiResponse === "CANNOT_SHORTEN" || aiResponse.includes("CANNOT_SHORTEN")) {
          // Mark as unshortenable
          await supabase
            .from("questions")
            .update({ 
              shorten_status: "unshortenable",
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id,
            original: question.question_text,
            shortened: null,
            status: 'unshortenable',
            originalLength: question.question_text.length,
            newLength: null,
            qualityIssue: 'AI-მ ვერ შეამოკლა'
          });
          unshortenable++;
        } else if (aiResponse.length > MAX_LENGTH) {
          // AI tried but still too long - mark as unshortenable
          await supabase
            .from("questions")
            .update({ 
              shorten_status: "unshortenable",
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id,
            original: question.question_text,
            shortened: aiResponse,
            status: 'unshortenable',
            originalLength: question.question_text.length,
            newLength: aiResponse.length,
            qualityIssue: `კვლავ ძალიან გრძელია (${aiResponse.length} > ${MAX_LENGTH})`
          });
          unshortenable++;
        } else if (aiResponse.length > 0) {
          // Georgian character detection guard for English questions
          const georgianPattern = /[\u10A0-\u10FF]/;
          if (question.language === 'en' && georgianPattern.test(aiResponse)) {
            console.log(`Question ${question.id}: English question got Georgian output, marking as failed`);
            results.push({
              id: question.id,
              original: question.question_text,
              shortened: aiResponse,
              status: 'failed',
              originalLength: question.question_text.length,
              newLength: aiResponse.length,
              qualityIssue: 'AI translated English to Georgian instead of shortening'
            });
            failed++;
            continue;
          }

          // Validate quality of shortened question
          const validation = isValidShortenedQuestion(aiResponse, question.question_text, question.language);
          
          if (!validation.valid) {
            // Failed quality validation - mark as unshortenable
            console.log(`Question ${question.id}: Failed validation - ${validation.reason}: ${validation.reasonGe}`);
            
            await supabase
              .from("questions")
              .update({ 
                shorten_status: "unshortenable",
                quality_issues: JSON.stringify([validation.reason]),
                original_question_text: question.question_text
              })
              .eq("id", question.id);

            results.push({
              id: question.id,
              original: question.question_text,
              shortened: aiResponse,
              status: 'unshortenable',
              originalLength: question.question_text.length,
              newLength: aiResponse.length,
              qualityIssue: validation.reasonGe
            });
            unshortenable++;
          } else {
            // Successfully shortened and validated - store in PENDING columns for review
            await supabase
              .from("questions")
              .update({ 
                pending_question_text: aiResponse,
                shorten_status: "pending_review",
                original_question_text: question.question_text
              })
              .eq("id", question.id);

            results.push({
              id: question.id,
              original: question.question_text,
              shortened: aiResponse,
              status: 'shortened',
              originalLength: question.question_text.length,
              newLength: aiResponse.length,
            });
            shortened++;
          }
        } else {
          // Empty response - mark as failed
          console.log(`Question ${question.id}: Empty AI response`);
          results.push({
            id: question.id,
            original: question.question_text,
            shortened: null,
            status: 'failed',
            originalLength: question.question_text.length,
            newLength: null,
            qualityIssue: 'AI-მ ცარიელი პასუხი დააბრუნა'
          });
          failed++;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        results.push({
          id: question.id,
          original: question.question_text,
          shortened: null,
          status: 'failed',
          originalLength: question.question_text.length,
          newLength: null,
        });
        failed++;
      }
    }

    const remaining = longQuestions.length - questionsToProcess.length;

    return new Response(
      JSON.stringify({
        done: remaining === 0 || testMode,
        processed: questionsToProcess.length,
        shortened,
        unshortenable,
        failed,
        remaining,
        results,
      }),
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
