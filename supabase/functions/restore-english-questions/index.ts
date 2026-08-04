import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const CATEGORY_ID = "b9a45cde-fa7a-47e4-bdd2-35b58085b95d";
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

function isGeorgian(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

async function translateBatch(
  questions: any[],
  apiKey: string
): Promise<any[]> {
  const prompt = `You are translating Georgian trivia questions about Anime/Manga back to English.

STRICT CHARACTER LIMITS - NEVER EXCEED:
- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (count carefully!)
- Each answer: MAXIMUM ${ANSWER_MAX_LENGTH} characters (count carefully!)

SHORTENING STRATEGIES (use aggressively):
- Use abbreviations: "Dragon Ball Z" → "DBZ", "One Piece" → "OP", "Attack on Titan" → "AoT"
- Drop articles: "the", "a", "an"
- Use shorter synonyms: "Which character" → "Who", "What is the name of" → "Who is"
- Shorten titles: use the most recognizable short form
- For answers: use last name only if character is well-known, abbreviate titles

Translate these questions:

${JSON.stringify(questions.map((q, i) => ({
  idx: i,
  question: q.question_text,
  correct: q.correct_answer,
  incorrect: q.incorrect_answers
})), null, 2)}

Return ONLY valid JSON:
{
  "translations": [
    {
      "idx": 0,
      "questionText": "English question (max ${QUESTION_MAX_LENGTH} chars)",
      "correctAnswer": "English answer (max ${ANSWER_MAX_LENGTH} chars)",
      "incorrectAnswers": ["...", "...", "..."]
    }
  ]
}`;

  const response = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel("google/gemini-2.5-flash"),
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
    const apiKey = AI_API_KEY;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch corrupted questions
    const { data: questions, error } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, language")
      .eq("category_id", CATEGORY_ID)
      .eq("quality_status", "needs_rewrite");

    if (error) throw error;
    if (!questions?.length) {
      return new Response(JSON.stringify({ message: "No questions to restore", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${questions.length} questions to restore`);

    // Separate Georgian vs already-English
    const georgianQs = questions.filter(q => isGeorgian(q.question_text));
    const englishQs = questions.filter(q => !isGeorgian(q.question_text));

    console.log(`Georgian: ${georgianQs.length}, Already English: ${englishQs.length}`);

    let restored = 0;
    let skipped = 0;

    // Reset already-English questions
    for (const q of englishQs) {
      const { error: updateError } = await supabase
        .from("questions")
        .update({
          quality_status: null,
          ai_review_score: null,
          ai_review_grade: null,
          ai_review_data: null,
          last_ai_review: null,
          language: "en",
        })
        .eq("id", q.id);

      if (updateError) {
        console.error(`Failed to reset ${q.id}:`, updateError);
        skipped++;
      } else {
        restored++;
      }
    }

    // Translate Georgian questions in batches of 10
    const batchSize = 10;
    for (let i = 0; i < georgianQs.length; i += batchSize) {
      const batch = georgianQs.slice(i, i + batchSize);
      console.log(`Translating batch ${Math.floor(i / batchSize) + 1}...`);

      try {
        const translations = await translateBatch(batch, apiKey);

        for (const t of translations) {
          const original = batch[t.idx];
          if (!original) continue;

          // Validate lengths
          if (
            t.questionText.length > QUESTION_MAX_LENGTH ||
            t.correctAnswer.length > ANSWER_MAX_LENGTH ||
            t.incorrectAnswers.some((a: string) => a.length > ANSWER_MAX_LENGTH)
          ) {
            console.warn(`Skipping ${original.id}: exceeds char limits`);
            skipped++;
            continue;
          }

          const { error: updateError } = await supabase
            .from("questions")
            .update({
              question_text: t.questionText,
              correct_answer: t.correctAnswer,
              incorrect_answers: t.incorrectAnswers,
              language: "en",
              quality_status: null,
              ai_review_score: null,
              ai_review_grade: null,
              ai_review_data: null,
              last_ai_review: null,
              in_production: false,
            })
            .eq("id", original.id);

          if (updateError) {
            console.error(`Failed to update ${original.id}:`, updateError);
            skipped++;
          } else {
            restored++;
          }
        }
      } catch (batchError) {
        console.error(`Batch failed:`, batchError);
        skipped += batch.length;
      }
    }

    const result = { restored, skipped, total: questions.length };
    console.log("Restoration complete:", result);

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
