import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

function isGeorgian(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

async function translateBatch(
  questions: Array<{ idx: number; question_text: string; incorrect_answers: string[] }>,
  apiKey: string
): Promise<Array<{ idx: number; questionText: string; incorrectAnswers?: string[] }>> {
  const prompt = `You are translating Georgian trivia question text to English. The answers are already in English — DO NOT translate answers unless explicitly included below.

STRICT CHARACTER LIMITS:
- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters
- Each answer (if included): MAXIMUM ${ANSWER_MAX_LENGTH} characters

SHORTENING STRATEGIES:
- Use abbreviations where well-known
- Drop articles: "the", "a", "an"
- Use shorter synonyms: "Which character" → "Who", "What is the name of" → "Who is"

Translate these:

${JSON.stringify(questions.map(q => {
  const georgianAnswers = q.incorrect_answers.filter(a => isGeorgian(a));
  return {
    idx: q.idx,
    question: q.question_text,
    ...(georgianAnswers.length > 0 ? { georgianAnswers } : {})
  };
}), null, 2)}

Return ONLY valid JSON:
{
  "translations": [
    {
      "idx": 0,
      "questionText": "English question (max ${QUESTION_MAX_LENGTH} chars)"${questions.some(q => q.incorrect_answers.some(a => isGeorgian(a))) ? `,
      "incorrectAnswers": ["only if Georgian answers were provided"]` : ''}
    }
  ]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("AI error:", response.status, err);
    throw new Error(`AI translation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");

  const parsed = JSON.parse(content);
  return parsed.translations || [];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const limit = body.limit || 100;

    // Fetch mixed-language questions: Georgian question text + non-Georgian answers
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, category_id, language")
      .eq("language", "ka")
      .eq("is_active", true)
      .eq("in_production", true)
      .limit(limit);

    if (error) throw error;

    // Filter to only mixed-language: Georgian question, non-Georgian correct answer
    const mixedQuestions = (questions || []).filter(q =>
      isGeorgian(q.question_text) && !isGeorgian(q.correct_answer)
    );

    if (mixedQuestions.length === 0) {
      return new Response(JSON.stringify({ message: "No mixed-language questions found", fixed: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${mixedQuestions.length} mixed-language questions to fix`);

    let fixed = 0;
    let skipped = 0;

    for (let i = 0; i < mixedQuestions.length; i += batchSize) {
      const batch = mixedQuestions.slice(i, i + batchSize);
      console.log(`Translating batch ${Math.floor(i / batchSize) + 1}...`);

      try {
        const batchInput = batch.map((q, idx) => ({
          idx,
          question_text: q.question_text,
          incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
        }));

        const translations = await translateBatch(batchInput, apiKey);

        for (const t of translations) {
          const original = batch[t.idx];
          if (!original) continue;

          // Validate question length
          if (t.questionText.length > QUESTION_MAX_LENGTH) {
            console.warn(`Skipping ${original.id}: question too long (${t.questionText.length} chars): "${t.questionText}"`);
            skipped++;
            continue;
          }

          const updates: Record<string, unknown> = {
            question_text: t.questionText,
            language: "en",
            in_production: false, // Move to library for review
          };

          // If there were Georgian incorrect answers that got translated
          if (t.incorrectAnswers && Array.isArray(t.incorrectAnswers)) {
            const anyTooLong = t.incorrectAnswers.some(a => a.length > ANSWER_MAX_LENGTH);
            if (anyTooLong) {
              console.warn(`Skipping ${original.id}: translated answer too long`);
              skipped++;
              continue;
            }
            updates.incorrect_answers = t.incorrectAnswers;
          }

          const { error: updateError } = await supabase
            .from("questions")
            .update(updates)
            .eq("id", original.id);

          if (updateError) {
            console.error(`Failed to update ${original.id}:`, updateError);
            skipped++;
          } else {
            fixed++;
          }
        }
      } catch (batchError) {
        console.error(`Batch failed:`, batchError);
        skipped += batch.length;
      }
    }

    // Count remaining
    const { count: remainingCount } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("language", "ka")
      .eq("is_active", true)
      .eq("in_production", true);

    const result = { fixed, skipped, total: mixedQuestions.length, remaining: remainingCount || 0 };
    console.log("Fix complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
