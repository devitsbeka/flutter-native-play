import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

/**
 * Fill the national categories (German History, Cocina española, ...) with
 * questions written directly in their own language.
 *
 * Same operating shape as translate-questions: driven by pg_cron every
 * minute, stateless — each run counts what a category already has and
 * generates toward the target, one category at a time in TARGETS order.
 * Guarded by the same TRANSLATE_SECRET header so no new secret needs to be
 * configured.
 *
 * Questions land with in_production = false: a category goes live only
 * after its sample has been reviewed, with a single UPDATE. Dedup is by
 * normalized question text against everything already in the category, so
 * retries and overlapping runs cannot double-insert.
 */

const TARGET_PER_CATEGORY = 200;
const BATCH_SIZE = 10; // questions per AI call
const PARALLEL_BATCHES = 6;
const TIME_BUDGET_MS = 50_000;
const PER_LEVEL = 10;

interface Target {
  slug: string;
  lang: string;
  brief: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German (Deutsch)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  it: "Italian (Italiano)",
  pt: "Portuguese (Português)",
};

const BRIEFS: Record<string, string> = {
  history:
    "the nation's history: rulers, wars, unification, key dates, movements, landmark events, historical figures",
  cuisine:
    "the nation's cuisine: dishes, ingredients, regional specialties, drinks, food traditions",
  culture:
    "the nation's culture: traditions, festivals, music, art, cinema, famous places, customs, notable people",
  literature:
    "the nation's literature: canonical authors, famous works, characters, poets, literary movements",
};

const NATION_LABEL: Record<string, string> = {
  german: "Germany",
  spanish: "Spain",
  french: "France",
  italian: "Italy",
  portuguese: "Portugal and the wider Portuguese-speaking world (including Brazil)",
};

const TARGETS: Target[] = [];
for (const [nation, lang] of [
  ["german", "de"],
  ["spanish", "es"],
  ["french", "fr"],
  ["italian", "it"],
  ["portuguese", "pt"],
] as const) {
  for (const domain of ["history", "cuisine", "culture", "literature"] as const) {
    TARGETS.push({
      slug: `${nation}_${domain}`,
      lang,
      brief: `${BRIEFS[domain]} — of ${NATION_LABEL[nation]}`,
    });
  }
}

interface GeneratedItem {
  question: string;
  correct: string;
  incorrect: string[];
  difficulty: string;
}

const normalize = (text: string) =>
  text.toLowerCase().replace(/[?.!,;:'"()«»¿¡]/g, "").replace(/\s+/g, " ").trim();

function buildPrompt(target: Target, avoid: string[]): string {
  return `Write ${BATCH_SIZE} original multiple-choice trivia questions IN ${LANGUAGE_NAMES[target.lang]} about ${target.brief}.

Rules:
- Every question and answer is written in ${LANGUAGE_NAMES[target.lang]} — never in English.
- Factually accurate and verifiable; no trick questions, no opinions.
- Question text at most 65 characters INCLUDING the trailing "?".
- The correct answer and each of the 3 incorrect answers at most 20 characters.
- The 3 incorrect answers are plausible same-type confusables; all 4 options mutually distinct; the question must not contain its own answer.
- Natural informal quiz tone (use the informal address where the language distinguishes).
- Mix difficulties: tag each question "easy", "medium" or "hard" (aim roughly half easy, a third medium, the rest hard).
- Do NOT repeat or trivially rephrase any of these already-used questions:
${avoid.slice(0, 80).map((q) => `  • ${q}`).join("\n")}

Return ONLY a JSON array, no markdown:
[{"question":"...","correct":"...","incorrect":["...","...","..."],"difficulty":"easy"}]`;
}

function parseAiJson(raw: string): GeneratedItem[] | null {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as GeneratedItem[]) : null;
  } catch {
    return null;
  }
}

function validItem(item: GeneratedItem): boolean {
  if (!item.question?.trim() || !item.correct?.trim()) return false;
  if (item.question.length > 70 || !item.question.trim().endsWith("?")) return false;
  if (item.correct.length > 20) return false;
  if (!Array.isArray(item.incorrect) || item.incorrect.length !== 3) return false;
  if (item.incorrect.some((a) => !a?.trim() || a.length > 20)) return false;
  const opts = [item.correct, ...item.incorrect].map((o) => o.trim().toLowerCase());
  if (new Set(opts).size !== 4) return false;
  if (!["easy", "medium", "hard"].includes(item.difficulty)) item.difficulty = "medium";
  if (normalize(item.question).includes(normalize(item.correct))) return false;
  return true;
}

async function generateBatch(target: Target, avoid: string[]): Promise<GeneratedItem[]> {
  const res = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel("google/gemini-2.5-flash"),
      // Reasoning kept minimal for cost — factual recall questions do not
      // benefit from hidden thinking tokens (learned the expensive way on
      // the translation run).
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content:
            "You are a professional trivia author writing in the requested language. Accuracy first. You answer with raw JSON only.",
        },
        { role: "user", content: buildPrompt(target, avoid) },
      ],
      temperature: 0.7,
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
  let currentSlug: string | null = null;
  let inserted = 0;
  let skipped = 0;
  let failedBatches = 0;
  let waves = 0;

  while (Date.now() - started < TIME_BUDGET_MS) {
    // Pick the first target still short of its quota.
    let target: Target | null = null;
    let catUuid: string | null = null;
    let existingTexts: string[] = [];
    for (const t of TARGETS) {
      const { data: cat, error: catErr } = await supabase
        .from("categories")
        .select("id")
        .eq("category_id", t.slug)
        .single();
      if (catErr || !cat) continue; // category migration not applied yet
      const { data: rows, error } = await supabase
        .from("questions")
        .select("question_text")
        .eq("category_id", cat.id)
        .eq("language", t.lang)
        .eq("is_active", true);
      if (error) throw error;
      if ((rows?.length ?? 0) < TARGET_PER_CATEGORY) {
        target = t;
        catUuid = cat.id;
        existingTexts = (rows ?? []).map((r) => r.question_text);
        break;
      }
    }
    if (!target || !catUuid) break; // every category is full

    currentSlug = target.slug;
    waves++;
    const seen = new Set(existingTexts.map(normalize));
    const need = TARGET_PER_CATEGORY - existingTexts.length;
    const batches = Math.min(PARALLEL_BATCHES, Math.ceil(need / BATCH_SIZE));

    const results = await Promise.allSettled(
      Array.from({ length: batches }, () => generateBatch(target!, existingTexts.slice(-80))),
    );

    const fresh: GeneratedItem[] = [];
    for (const r of results) {
      if (r.status === "rejected") {
        failedBatches++;
        console.error(`generate-national-questions: batch failed (${target.slug}):`, r.reason);
        continue;
      }
      for (const item of r.value) {
        if (!validItem(item)) {
          skipped++;
          continue;
        }
        const key = normalize(item.question);
        if (seen.has(key)) {
          skipped++;
          continue;
        }
        seen.add(key);
        fresh.push(item);
      }
    }

    if (fresh.length > 0) {
      const base = existingTexts.length + 0;
      const rows = fresh.slice(0, need).map((item, i) => ({
        category_id: catUuid,
        language: target!.lang,
        question_text: item.question.trim(),
        correct_answer: item.correct.trim(),
        incorrect_answers: item.incorrect.map((a) => a.trim()),
        difficulty: item.difficulty,
        level_number: Math.floor((base + i) / PER_LEVEL) + 1,
        is_active: true,
        // Reviewed before going live — flipped per category with one UPDATE.
        in_production: false,
      }));
      const { error } = await supabase.from("questions").insert(rows);
      if (error) throw error;
      inserted += rows.length;
    }

    if (results.every((r) => r.status === "rejected")) break;
  }

  const summary = { category: currentSlug, waves, inserted, skipped, failedBatches, ms: Date.now() - started };
  console.log("generate-national-questions:", JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
