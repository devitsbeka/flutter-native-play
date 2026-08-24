#!/usr/bin/env node
/**
 * What every category would advertise, and what it is short of a target.
 *
 * total_levels is set by a database trigger — questions divided by ten, using
 * the thinnest language for a shared category and its own language for one
 * flagged is_language_specific. That number is invisible until a player opens
 * a category and finds one unlocked tile, which is how საქართველოს ისტორია
 * sat at a single level with 194 Georgian questions behind it.
 *
 * This prints the same arithmetic the trigger does, per category and per
 * language, so the gap is a work-list rather than a surprise.
 *
 *   node scripts/level-coverage.mjs              # summary + short categories
 *   node scripts/level-coverage.mjs --all        # every category
 *   node scripts/level-coverage.mjs --levels 20  # target (default 20)
 *   node scripts/level-coverage.mjs --csv        # machine-readable
 *
 * Reads .env for the project ref and the publishable (anon) key — both public
 * by design, and enough for these two tables.
 *
 * PostgREST caps a response at 1000 rows however large a `limit` you ask for,
 * and it does so silently. This pages deliberately; a single wide request
 * returns a plausible-looking answer computed from the first thousand
 * questions, which is exactly the mistake that produced a false report of a
 * healthy category being about to collapse.
 */
import { readFileSync } from "node:fs";

const QUESTIONS_PER_LEVEL = 10;
const PAGE = 1000;
const LANGS = ["ka", "en", "de", "es", "fr", "it", "pt"];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (f, d) => {
  const i = args.indexOf(f);
  return i === -1 ? d : args[i + 1];
};
const TARGET_LEVELS = Number(arg("--levels", "20"));
const TARGET = TARGET_LEVELS * QUESTIONS_PER_LEVEL;

function env(key) {
  const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .find((l) => l.startsWith(key + "="));
  if (!line) throw new Error(`${key} missing from .env`);
  return line.slice(key.length + 1).replace(/^"|"$/g, "").trim();
}

const URL_BASE = env("VITE_SUPABASE_URL");
const KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function fetchAll(path) {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${URL_BASE}/rest/v1/${path}&offset=${offset}&limit=${PAGE}`, { headers });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    // A short page is the last page. Trusting a requested limit here is what
    // silently truncates the whole count.
    if (rows.length < PAGE) return out;
  }
}

const categories = await fetchAll(
  "categories?select=id,category_id,name,language,is_language_specific,total_levels,is_active&order=id.asc"
);
const questions = await fetchAll(
  "questions?select=category_id,language&is_active=eq.true&in_production=eq.true&order=id.asc"
);

const counts = new Map();
for (const q of questions) {
  if (!counts.has(q.category_id)) counts.set(q.category_id, new Map());
  const m = counts.get(q.category_id);
  m.set(q.language, (m.get(q.language) ?? 0) + 1);
}

/** The languages a category is actually expected to serve. */
const servedLangs = (c) => (c.is_language_specific ? [c.language] : LANGS);

const report = categories
  .filter((c) => c.is_active)
  .map((c) => {
    const m = counts.get(c.id) ?? new Map();
    const langs = servedLangs(c);
    const per = Object.fromEntries(langs.map((l) => [l, m.get(l) ?? 0]));
    const thinnest = Math.min(...langs.map((l) => per[l]));
    const levels = Math.max(1, Math.min(38, Math.floor(thinnest / QUESTIONS_PER_LEVEL)));
    const gap = langs.reduce((n, l) => n + Math.max(0, TARGET - per[l]), 0);
    return { ...c, per, thinnest, levels, gap, langs };
  })
  .sort((a, b) => b.gap - a.gap || a.category_id.localeCompare(b.category_id));

if (has("--csv")) {
  console.log(["category_id", "language_specific", "levels_now", "target_levels", ...LANGS, "questions_needed"].join(","));
  for (const r of report) {
    console.log(
      [r.category_id, r.is_language_specific, r.levels, TARGET_LEVELS, ...LANGS.map((l) => r.per[l] ?? ""), r.gap].join(",")
    );
  }
  process.exit(0);
}

const short = report.filter((r) => r.gap > 0);
const totalGap = report.reduce((n, r) => n + r.gap, 0);

console.log(`\n${report.length} active categories, ${questions.length.toLocaleString()} live questions.`);
console.log(`Target: ${TARGET_LEVELS} levels = ${TARGET} questions in every language a category serves.\n`);
console.log(`${short.length} categories are short, by ${totalGap.toLocaleString()} questions in total.\n`);

const shown = has("--all") ? report : short;
const w = Math.max(...shown.map((r) => r.category_id.length), 8);
console.log(`${"category".padEnd(w)}  ${"lvls".padStart(4)}  ${"need".padStart(6)}   per-language shortfall`);
console.log("-".repeat(w + 40));
for (const r of shown) {
  const missing = r.langs
    .map((l) => [l, TARGET - (r.per[l] ?? 0)])
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `${l}+${n}`)
    .join(" ");
  const tag = r.is_language_specific ? ` [${r.language}-only]` : "";
  console.log(`${r.category_id.padEnd(w)}  ${String(r.levels).padStart(4)}  ${String(r.gap).padStart(6)}   ${missing}${tag}`);
}

// A category whose stored number disagrees with the arithmetic has not had
// the trigger fire since its questions last changed. Worth knowing: it is the
// difference between "needs questions" and "needs a recount".
const stale = report.filter((r) => r.total_levels !== r.levels);
if (stale.length) {
  console.log(`\n${stale.length} categories store a level count the questions no longer support:`);
  for (const r of stale) {
    console.log(`  ${r.category_id.padEnd(w)}  stored ${r.total_levels}  ->  ${r.levels}`);
  }
  console.log("  (a recount fixes these; no new questions needed)");
}
console.log();
