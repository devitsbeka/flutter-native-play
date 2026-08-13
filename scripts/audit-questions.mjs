#!/usr/bin/env node
/**
 * Audit the question bank for defects that reach the player.
 *
 * Run:  node scripts/audit-questions.mjs [--lang en] [--all] [--csv out.csv]
 *
 *   --lang <code>  language column to audit (default: en)
 *   --all          include drafts; by default only in_production rows are
 *                  reported, because those are the ones players actually see
 *   --csv <path>   write the full triage list (one row per flagged question)
 *
 * Reads with the publishable anon key — the questions table already exposes
 * active rows to anonymous clients, so no service role is needed.
 *
 * The thresholds here are derived from what the game actually renders, not
 * from the config constants, because the two disagree:
 *
 *   Questions  (src/components/ui/quiz-question-card.tsx:50-56)
 *     Font steps 20px -> 19px (>50 chars) -> 18px (>60 chars) and then STOPS.
 *     There is no line-clamp and no max-height, so past the 80px min-height
 *     the card just grows. The answer list below it is `flex-1 overflow-y-auto`,
 *     so a long question does not get truncated — it silently pushes the
 *     answers into a scroll region. At ~318px of line box on a 390pt iPhone,
 *     18px text fits ~40 chars per line, so 70 chars is the last length that
 *     reliably lands in two lines.
 *
 *   Answers  (src/components/ui/quiz-answer-button.tsx:140-154)
 *     `line-clamp-2` — this one is a hard ellipsis, the text is genuinely
 *     lost. Font drops 16px -> 14px past 30 chars and then stops. Two lines
 *     of ~286px at 14px is ~75 chars on a phone; TV mode puts the same button
 *     in a 2-column grid at 18px, where the clamp bites at roughly 48.
 *
 * So a question can be over the project's own 70/20 standard and still look
 * fine, but past QUESTION_SQUEEZE / ANSWER_CLIP_TV it is visibly broken.
 */

import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.\n" +
      "Copy .env.example to .env and fill them in, then re-run with:\n" +
      "  set -a && . ./.env && set +a && node scripts/audit-questions.mjs",
  );
  process.exit(1);
}

// ── thresholds ────────────────────────────────────────────────────────────
/** The project's own standard (src/constants/questionQuality.ts). */
const QUESTION_STANDARD = 70;
const ANSWER_STANDARD = 20;
/** Past here the question eats the answer area on a phone. */
const QUESTION_SQUEEZE = 90;
/** Past here answer text is ellipsized in TV mode's 2-column grid. */
const ANSWER_CLIP_TV = 48;
/** Past here it is ellipsized on a phone too. */
const ANSWER_CLIP_PHONE = 75;
/** src/constants/questionQuality.ts MAX_ANSWER_LENGTH_DIFF */
const ANSWER_SPREAD = 8;

// ── argv ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
};
const LANG = arg("--lang", "en");
const INCLUDE_DRAFTS = argv.includes("--all");
const CSV_PATH = arg("--csv", null);

// ── fetch ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  "id",
  "category_id",
  "question_text",
  "correct_answer",
  "incorrect_answers",
  "difficulty",
  "in_production",
  "icon_slug",
  "image_url",
  "video_url",
  "audio_url",
  "ai_review_grade",
].join(",");

async function fetchAll(table, query) {
  const rows = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&order=id&offset=${offset}&limit=${PAGE}`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────
const options = (q) => {
  let wrong = q.incorrect_answers ?? [];
  if (typeof wrong === "string") {
    try {
      wrong = JSON.parse(wrong);
    } catch {
      wrong = [];
    }
  }
  return [String(q.correct_answer), ...wrong.map(String)];
};

const normalize = (s) =>
  String(s)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(
  ("what which who whom whose when where why how the a an of in on for to is are was " +
    "were did does do by with from that this these those it its as at or and").split(" "),
);
const contentWords = (s) =>
  new Set(
    normalize(s)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

const jaccard = (a, b) => {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
};

// ── checks ────────────────────────────────────────────────────────────────
/**
 * Each check returns a severity or null.
 *   broken   — the player sees something wrong or unreadable
 *   standard — violates the project's own 70/20 rule but still renders
 *   review   — needs a human to judge
 */
const CHECKS = [
  {
    id: "option-count",
    severity: "broken",
    describe: (q) => {
      const n = options(q).length;
      return n === 4 ? null : `${n} answer options, expected 4`;
    },
  },
  {
    id: "duplicate-options",
    severity: "broken",
    describe: (q) => {
      const seen = new Map();
      for (const o of options(q)) seen.set(normalize(o), (seen.get(normalize(o)) ?? 0) + 1);
      const dupes = [...seen].filter(([, n]) => n > 1).map(([k]) => k || "(empty)");
      return dupes.length ? `repeated option text: ${dupes.join(", ")}` : null;
    },
  },
  {
    id: "foreign-script",
    severity: "broken",
    describe: (q) => {
      const blob = q.question_text + " " + options(q).join(" ");
      if (LANG === "en" && /[Ⴀ-ჿ]/.test(blob)) return "Georgian text in an English row";
      if (LANG === "en" && /[Ѐ-ӿ]/.test(blob)) return "Cyrillic text in an English row";
      if (LANG === "ka" && /\b[A-Za-z]{4,}\b/.test(options(q).join(" ")))
        return "Latin-only answer in a Georgian row";
      return null;
    },
  },
  {
    id: "answer-clipped-phone",
    severity: "broken",
    describe: (q) => {
      const worst = Math.max(...options(q).map((o) => o.length));
      return worst > ANSWER_CLIP_PHONE
        ? `answer is ${worst} chars — ellipsized on phone (line-clamp-2)`
        : null;
    },
  },
  {
    id: "answer-clipped-tv",
    severity: "broken",
    describe: (q) => {
      const worst = Math.max(...options(q).map((o) => o.length));
      return worst > ANSWER_CLIP_TV && worst <= ANSWER_CLIP_PHONE
        ? `answer is ${worst} chars — ellipsized in TV mode's 2-column grid`
        : null;
    },
  },
  {
    id: "question-squeezes-answers",
    severity: "broken",
    describe: (q) =>
      q.question_text.length > QUESTION_SQUEEZE
        ? `question is ${q.question_text.length} chars — wraps past the card and pushes answers into a scroll region`
        : null,
  },
  {
    id: "question-over-standard",
    severity: "standard",
    describe: (q) => {
      const n = q.question_text.length;
      return n > QUESTION_STANDARD && n <= QUESTION_SQUEEZE
        ? `${n} chars, over the ${QUESTION_STANDARD} standard`
        : null;
    },
  },
  {
    id: "answer-over-standard",
    severity: "standard",
    describe: (q) => {
      const worst = Math.max(...options(q).map((o) => o.length));
      return worst > ANSWER_STANDARD && worst <= ANSWER_CLIP_TV
        ? `longest answer ${worst} chars, over the ${ANSWER_STANDARD} standard`
        : null;
    },
  },
  {
    id: "answer-length-imbalance",
    severity: "standard",
    describe: (q) => {
      const lens = options(q).map((o) => o.length);
      const spread = Math.max(...lens) - Math.min(...lens);
      return spread > ANSWER_SPREAD ? `answer lengths spread ${spread} chars` : null;
    },
  },
  {
    id: "correct-is-longest",
    severity: "review",
    describe: (q) => {
      const [correct, ...wrong] = options(q);
      const longestWrong = Math.max(...wrong.map((o) => o.length));
      return correct.length > longestWrong + 10 && correct.length > 18
        ? `correct answer is ${correct.length - longestWrong} chars longer than any distractor — guessable without knowing the answer`
        : null;
    },
  },
  {
    id: "answer-in-question",
    severity: "review",
    describe: (q) => {
      const correct = normalize(q.correct_answer);
      return correct.length > 4 && normalize(q.question_text).includes(correct)
        ? `the correct answer "${q.correct_answer}" appears in the question text`
        : null;
    },
  },
  {
    id: "type-mismatch",
    severity: "review",
    describe: (q) => {
      const opts = options(q);
      const numeric = opts.map((o) => /^[\s~≈<>]*\d/.test(o.trim()));
      if (numeric[0] && !numeric.slice(1).some(Boolean))
        return "correct answer is a number, every distractor is words";
      if (!numeric[0] && numeric.slice(1).every(Boolean))
        return "correct answer is words, every distractor is a number";
      if (/^how many\b/i.test(q.question_text) && !opts.every((o) => /\d/.test(o)))
        return '"How many" question with non-numeric options';
      return null;
    },
  },
  {
    id: "media-reference-without-media",
    severity: "review",
    describe: (q) => {
      const hasMedia = q.image_url || q.video_url || q.audio_url;
      const refs =
        /\b(shown (above|below|here)|in the (image|picture|photo|video|clip)|this (image|picture|photo|video|clip|song)|pictured|listen to|look at the)\b/i;
      return !hasMedia && refs.test(q.question_text)
        ? "refers to media the question does not have"
        : null;
    },
  },
  {
    id: "clipped-abbreviation",
    severity: "review",
    describe: (q) => {
      const m = options(q)
        .join(" ")
        .match(
          /\b(Fdn|Intl\.?|Assoc\.?|Dept\.?|Cncl|Comm\.|Univ\.?|Natl\.?|Govt\.?|Mgmt|Stk|Exch|Bldg|Prod\.|Constel\.|Atmos|Photosynth|Calc\.|H\.L\.|w\/)\b/,
        );
      return m ? `answers contain the clipped abbreviation "${m[0]}" — reads as machine-shortened` : null;
    },
  },
  {
    id: "subjective-stem",
    severity: "review",
    describe: (q) => {
      const m = q.question_text.match(
        /\b(most (unusual|surprising|iconic|interesting|unrealistic|controversial|impressive|beloved|memorable)|best (describes|explains|represents|captures)|ideal|widely regarded|arguably)\b/i,
      );
      return m ? `"${m[0]}" — no single defensible answer` : null;
    },
  },
  {
    id: "time-sensitive",
    severity: "review",
    describe: (q) => {
      const m = q.question_text.match(
        /\b(currently|as of (today|now|20\d\d)|nowadays|right now|this year|latest|most recent|newest|reigning|incumbent|richest|most followed|most subscribed|best[- ]selling|highest[- ]grossing|most streamed|most downloaded)\b/i,
      );
      return m ? `"${m[0]}" — the answer changes over time` : null;
    },
  },
  {
    id: "no-question-mark",
    severity: "review",
    describe: (q) => {
      const t = q.question_text.trim();
      return t.endsWith("?") ? null : `ends with ${JSON.stringify(t.slice(-1))}, not "?"`;
    },
  },
];

// ── run ───────────────────────────────────────────────────────────────────
const [questions, categories] = await Promise.all([
  fetchAll("questions", `select=${COLUMNS}&language=eq.${LANG}`),
  fetchAll("categories", "select=id,name"),
]);

const categoryName = new Map(categories.map((c) => [c.id, c.name]));
const scope = INCLUDE_DRAFTS ? questions : questions.filter((q) => q.in_production);

const findings = [];
for (const q of scope) {
  for (const check of CHECKS) {
    let detail;
    try {
      detail = check.describe(q);
    } catch (err) {
      detail = `check threw: ${err.message}`;
    }
    if (detail) findings.push({ question: q, check: check.id, severity: check.severity, detail });
  }
}

// Duplicate detection needs the whole set, so it runs outside the per-row loop.
const signatures = scope.map((q) => [q, contentWords(q.question_text)]);
const index = new Map();
for (const [q, words] of signatures) {
  for (const w of words) {
    if (!index.has(w)) index.set(w, []);
    index.get(w).push([q, words]);
  }
}
const seenPair = new Set();
for (const [q, words] of signatures) {
  if (words.size < 3) continue;
  const counts = new Map();
  for (const w of words) {
    const bucket = index.get(w);
    if (bucket.length >= 200) continue; // too common to be a useful signal
    for (const [other] of bucket) {
      if (other.id !== q.id) counts.set(other.id, (counts.get(other.id) ?? 0) + 1);
    }
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [otherId] of ranked) {
    const key = [q.id, otherId].sort().join("|");
    if (seenPair.has(key)) continue;
    const entry = signatures.find(([o]) => o.id === otherId);
    if (!entry) continue;
    const [other, otherWords] = entry;
    if (jaccard(words, otherWords) < 0.7) continue;
    seenPair.add(key);
    const sameAnswer = normalize(q.correct_answer) === normalize(other.correct_answer);
    findings.push({
      question: q,
      check: sameAnswer ? "duplicate-question" : "contradicting-duplicate",
      severity: sameAnswer ? "review" : "broken",
      detail: sameAnswer
        ? `near-identical to ${other.id} ("${other.question_text}")`
        : `near-identical to ${other.id} but answers disagree: "${q.correct_answer}" vs "${other.correct_answer}"`,
    });
  }
}

// ── report ────────────────────────────────────────────────────────────────
const SEVERITY_ORDER = ["broken", "standard", "review"];
const byCheck = new Map();
for (const f of findings) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, { severity: f.severity, rows: [] });
  byCheck.get(f.check).rows.push(f);
}

const label = INCLUDE_DRAFTS ? "all" : "in-production";
console.log(`\nQuestion audit — language "${LANG}", ${label}: ${scope.length} questions\n`);

for (const severity of SEVERITY_ORDER) {
  const group = [...byCheck].filter(([, v]) => v.severity === severity);
  if (!group.length) continue;
  const heading = {
    broken: "BROKEN — the player sees this go wrong",
    standard: "OFF-STANDARD — renders, but violates the project's own 70/20 rule",
    review: "NEEDS REVIEW — a human has to judge",
  }[severity];
  console.log(heading);
  for (const [check, { rows }] of group.sort((a, b) => b[1].rows.length - a[1].rows.length)) {
    console.log(`  ${check.padEnd(32)} ${String(rows.length).padStart(5)}`);
  }
  console.log("");
}

const affected = new Set(findings.map((f) => f.question.id));
const brokenIds = new Set(
  findings.filter((f) => f.severity === "broken").map((f) => f.question.id),
);
console.log(`${affected.size} of ${scope.length} questions carry at least one finding`);
console.log(`${brokenIds.size} of ${scope.length} are broken for the player\n`);

if (CSV_PATH) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["id", "severity", "check", "detail", "category", "difficulty", "ai_grade", "question", "correct"]
      .map(esc)
      .join(","),
    ...findings
      .sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
          a.check.localeCompare(b.check),
      )
      .map((f) =>
        [
          f.question.id,
          f.severity,
          f.check,
          f.detail,
          categoryName.get(f.question.category_id) ?? "",
          f.question.difficulty,
          f.question.ai_review_grade ?? "",
          f.question.question_text,
          f.question.correct_answer,
        ]
          .map(esc)
          .join(","),
      ),
  ];
  writeFileSync(CSV_PATH, lines.join("\n"));
  console.log(`Triage list written to ${CSV_PATH} (${findings.length} rows)`);
}

process.exitCode = brokenIds.size > 0 ? 1 : 0;
