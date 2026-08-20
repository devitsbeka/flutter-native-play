import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

/**
 * Translate the English question bank into the app's other languages.
 *
 * Driven by pg_cron every few minutes; each run grabs batches of English
 * production questions that have no translation yet in the current target
 * language (via get_untranslated_questions), translates them in one AI call
 * per batch, and inserts the results as full question rows pointing back at
 * their source through translated_from. The unique index on
 * (translated_from, language) makes retries free: a batch that half-landed
 * before a crash simply skips the half that landed.
 *
 * Languages are done strictly one at a time, in TARGETS order, and the batch
 * picker orders by category — so German becomes playable category by
 * category, then Spanish begins, and so on. Stateless on purpose: "where
 * are we?" is always re-derived from what is already in the table.
 *
 * Guarded like push-test-loop: verify_jwt = false so pg_cron can call it,
 * and the caller must present TRANSLATE_SECRET in x-cron-secret.
 */

const TARGETS = ["de", "es", "fr", "it", "pt"] as const;

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German (Deutsch)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  it: "Italian (Italiano)",
  pt: "Portuguese (Português)",
};

const BATCH_SIZE = 14;
const MAX_BATCHES_PER_RUN = 10;
const TIME_BUDGET_MS = 45_000;

interface SourceQuestion {
  id: string;
  category_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string | null;
  level_number: number | null;
  icon_slug: string | null;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
}

interface TranslatedItem {
  id: string;
  question: string;
  correct: string;
  incorrect: string[];
}

function buildPrompt(language: string, batch: SourceQuestion[]): string {
  const items = batch.map((q) => ({
    id: q.id,
    question: q.question_text,
    correct: q.correct_answer,
    incorrect: q.incorrect_answers,
  }));
  return `Translate these trivia quiz questions from English into ${LANGUAGE_NAMES[language]}.

Rules:
- Preserve the exact meaning; the correct answer must stay correct.
- Proper nouns, film/song/book titles: use the official ${LANGUAGE_NAMES[language]} form if one is widely used, otherwise keep the original.
- Names of people stay as they are. Numbers, dates and units stay as they are.
- Be concise: questions under 90 characters, answers under 24 characters where possible.
- Natural, informal quiz tone (use "du"-style address where the language distinguishes).
- Translate every item. Keep each item's "id" untouched. Keep the "incorrect" array the same length and order.

Return ONLY a JSON array, no markdown, shaped exactly like the input:
[{"id":"...","question":"...","correct":"...","incorrect":["...","...","..."]}]

Input:
${JSON.stringify(items)}`;
}

function parseAiJson(raw: string): TranslatedItem[] | null {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as TranslatedItem[]) : null;
  } catch {
    return null;
  }
}

async function translateBatch(
  language: string,
  batch: SourceQuestion[],
): Promise<TranslatedItem[]> {
  const res = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel("google/gemini-2.5-flash"),
      messages: [
        {
          role: "system",
          content:
            "You are a professional game localizer. You translate trivia questions faithfully and answer with raw JSON only.",
        },
        { role: "user", content: buildPrompt(language, batch) },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const parsed = parseAiJson(content);
  if (!parsed) throw new Error(`Unparseable AI response: ${content.slice(0, 200)}`);
  return parsed;
}

/** A translated item is usable only if it still works as a quiz question. */
function validItem(item: TranslatedItem, source: SourceQuestion): boolean {
  if (!item.question?.trim() || !item.correct?.trim()) return false;
  if (!Array.isArray(item.incorrect)) return false;
  if (item.incorrect.length !== source.incorrect_answers.length) return false;
  if (item.incorrect.some((a) => !a?.trim())) return false;
  const correct = item.correct.trim().toLowerCase();
  // A translation that collapses the correct answer into a wrong one makes
  // the question unanswerable; skip it and let a later run retry.
  if (item.incorrect.some((a) => a.trim().toLowerCase() === correct)) return false;
  return true;
}

serve(async (req) => {
  const secret = Deno.env.get("TRANSLATE_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  if (!AI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI provider not configured" }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = Date.now();
  let language: string | null = null;
  let translated = 0;
  let skipped = 0;
  let batches = 0;

  while (batches < MAX_BATCHES_PER_RUN && Date.now() - started < TIME_BUDGET_MS) {
    // One language at a time: the first target that still has gaps. Re-checked
    // per batch only when the previous language just finished.
    let batch: SourceQuestion[] = [];
    if (language) {
      const { data, error } = await supabase.rpc("get_untranslated_questions", {
        p_language: language,
        p_limit: BATCH_SIZE,
      });
      if (error) throw error;
      batch = (data ?? []) as SourceQuestion[];
    }
    if (batch.length === 0) {
      language = null;
      for (const target of TARGETS) {
        const { data, error } = await supabase.rpc("get_untranslated_questions", {
          p_language: target,
          p_limit: BATCH_SIZE,
        });
        if (error) throw error;
        if (data && data.length > 0) {
          language = target;
          batch = data as SourceQuestion[];
          break;
        }
      }
      if (!language) break; // everything translated
    }

    batches++;
    const bySourceId = new Map(batch.map((q) => [q.id, q]));

    let items: TranslatedItem[];
    try {
      items = await translateBatch(language, batch);
    } catch (e) {
      // One failed AI call ends the run, not the pipeline — cron retries the
      // same batch in a few minutes.
      console.error(`translate-questions: batch failed (${language}):`, e);
      break;
    }

    const rows = [];
    for (const item of items) {
      const source = bySourceId.get(item.id);
      if (!source || !validItem(item, source)) {
        skipped++;
        continue;
      }
      rows.push({
        category_id: source.category_id,
        language,
        question_text: item.question.trim(),
        correct_answer: item.correct.trim(),
        incorrect_answers: item.incorrect.map((a) => a.trim()),
        difficulty: source.difficulty,
        level_number: source.level_number,
        icon_slug: source.icon_slug,
        image_url: source.image_url,
        video_url: source.video_url,
        audio_url: source.audio_url,
        is_active: true,
        in_production: true,
        translated_from: source.id,
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from("questions")
        .upsert(rows, { onConflict: "translated_from,language", ignoreDuplicates: true });
      if (error) throw error;
      translated += rows.length;
    }
  }

  const summary = { language, batches, translated, skipped, ms: Date.now() - started };
  console.log("translate-questions:", JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
