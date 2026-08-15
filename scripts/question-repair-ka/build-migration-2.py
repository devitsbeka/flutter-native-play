#!/usr/bin/env python3
"""Turn the batch-2 review files into a second SQL migration.

Run:  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration-2.py

Batch 1 (20260815120000_question_repair_ka.sql) is already applied. It covered
the mechanical sweeps, the duplicate resolution and four Georgian categories.
This script covers the other forty-one categories, read by hand afterwards, and
emits only statements for rows that are still live.

Inputs: every <category>.json in this directory except the batch-1 ones listed
in BATCH1 below. Each finding is {id, kind, note} plus "fix" (a partial row) or
"action" ("retire" or "flag") — a finding may carry both a fix and a flag.

Retire beats rewrite, as in batch 1: a row that is retired is never also
rewritten or flagged.

Every rewrite copies the current text into original_question_text /
original_correct_answer / original_incorrect_answers first, so the studio can
show a before and after and a bad call can be reverted one row at a time.
"""

import json
import os
import pathlib
import sys
import urllib.request

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260816120000_question_repair_ka_batch2.sql"

# Consumed by build-migration.py for batch 1; not re-emitted here.
BATCH1 = {
    "dup_decisions.json",
    "shorten.json",
    "answer_fixes.json",
    "duplicates-resolved.json",
    "_mechanical.json",
    "georgian_cuisine.json",
    "georgian_culture.json",
    "georgian_history.json",
    "georgian_literature.json",
}

# The render limits the card enforces: quiz-question-card.tsx steps the stem
# font down to 18px and stops, and quiz-answer-button.tsx clamps answers to two
# lines. Anything past these overflows or is cut off on a phone.
MAX_QUESTION = 90
MAX_ANSWER = 48

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.\n"
        "  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration-2.py"
    )

COLUMNS = "id,category_id,question_text,correct_answer,incorrect_answers,in_production,is_active"


def fetch_questions():
    rows, page = [], 1000
    for offset in range(0, 20000, page):
        url = (
            f"{SUPABASE_URL}/rest/v1/questions?select={COLUMNS}"
            f"&language=eq.ka&order=id&offset={offset}&limit={page}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        with urllib.request.urlopen(req) as resp:
            batch = json.load(resp)
        rows.extend(batch)
        if len(batch) < page:
            break
    return rows


questions = fetch_questions()
by_id = {q["id"]: q for q in questions}
by_short = {q["id"][:8]: q["id"] for q in questions}


def full(short):
    if short in by_id:
        return short
    return by_short.get(short)


# ── collect ───────────────────────────────────────────────────────────────
retire = {}   # id -> reason
rewrite = {}  # id -> {column: value}
flag = {}     # id -> reason
gone = []     # findings whose row is no longer live

for path in sorted(HERE.glob("*.json")):
    if path.name in BATCH1:
        continue
    for f in json.loads(path.read_text()):
        qid = full(f["id"])
        if not qid:
            gone.append(f"{path.stem}/{f['id']}")
            continue
        if f.get("action") == "retire":
            retire[qid] = f["note"]
        elif f.get("action") == "flag":
            flag[qid] = f["note"]
        if "fix" in f:
            rewrite.setdefault(qid, {}).update(f["fix"])

# Retire beats rewrite, always.
for qid in retire:
    rewrite.pop(qid, None)
    flag.pop(qid, None)

# ── check the rewrites fit the card before emitting them ──────────────────
problems = []
for qid, patch in rewrite.items():
    row = by_id[qid]
    text = patch.get("question_text", row["question_text"])
    if len(text) > MAX_QUESTION:
        problems.append(f"{qid[:8]} question {len(text)} chars: {text[:60]}")
    answers = [patch.get("correct_answer", row["correct_answer"])]
    wrong = patch.get("incorrect_answers")
    if wrong is None:
        wrong = row["incorrect_answers"]
        if isinstance(wrong, str):
            wrong = json.loads(wrong)
    answers += list(wrong)
    if len(answers) != 4:
        problems.append(f"{qid[:8]} has {len(answers)} options, expected 4")
    if len({a.strip() for a in answers}) != len(answers):
        problems.append(f"{qid[:8]} repeats an option: {answers}")
    for a in answers:
        if len(a) > MAX_ANSWER:
            problems.append(f"{qid[:8]} answer {len(a)} chars: {a}")
if problems:
    print("Rewrites that would not fit the card:")
    for p in problems:
        print("  " + p)
    sys.exit(1)

if gone:
    print(f"{len(gone)} findings point at rows that are no longer live (retired in batch 1):")
    for g in gone[:20]:
        print("  " + g)

print(f"retire {len(retire)} · rewrite {len(rewrite)} · flag {len(flag)}")


# ── emit ──────────────────────────────────────────────────────────────────
def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def jsonb(values):
    return q(json.dumps(list(values), ensure_ascii=False)) + "::jsonb"


lines = [
    "-- Georgian question bank repair, batch 2.",
    "--",
    "-- Generated by scripts/question-repair-ka/build-migration-2.py from the",
    "-- per-category review files beside it. Regenerate rather than editing this",
    "-- by hand.",
    "--",
    "-- Batch 1 (20260815120000) fixed what a rule can find — length, duplicate",
    "-- option sets, stray whitespace, non-Georgian script — and fact-checked four",
    "-- Georgian categories. This batch is the hand read of the other forty-one:",
    "-- circular stems, invented terms, distractors that are as correct as the",
    "-- answer, and pairs of questions that teach opposite facts.",
    "--",
    "-- Three things happen, in this order:",
    "--",
    "--   1. Unanswerable and wrong questions are retired: is_active = false and",
    "--      in_production = false. Nothing is deleted, so any row can be brought",
    "--      back with a single UPDATE.",
    "--",
    "--   2. Repaired questions go straight back to production. Every one of these",
    "--      rows is already being served; a stem that is no longer half English,",
    "--      or an option that is no longer a truncation, cannot be worse than what",
    "--      is live right now.",
    "--",
    "--   3. Questions that need a Georgian editor rather than a rewrite are marked",
    "--      quality_status = 'needs_review' and LEFT IN PRODUCTION. These are facts",
    "--      this pass could not verify, or questions with more than one defensible",
    "--      answer — not facts it found wrong.",
    "--",
    "-- Every rewrite keeps the original in original_question_text /",
    "-- original_correct_answer / original_incorrect_answers.",
    "",
    "BEGIN;",
    "",
    "-- ── 1. retirements ───────────────────────────────────────────────────",
    "",
]

for qid in sorted(retire, key=lambda i: by_id[i]["question_text"]):
    row = by_id[qid]
    lines.append(f"-- {row['question_text'][:90]}")
    lines.append(f"--   {retire[qid][:150]}")
    lines.append(
        "UPDATE public.questions SET is_active = false, in_production = false, "
        f"quality_status = 'retired_ka_repair', updated_at = now() WHERE id = {q(qid)};"
    )

lines += ["", "-- ── 2. rewrites ─────────────────────────────────────────────────────", ""]

for qid in sorted(rewrite, key=lambda i: by_id[i]["question_text"]):
    row = by_id[qid]
    patch = rewrite[qid]
    sets = [
        "original_question_text = COALESCE(original_question_text, question_text)",
        "original_correct_answer = COALESCE(original_correct_answer, correct_answer)",
        "original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers)",
    ]
    if "question_text" in patch:
        sets.append(f"question_text = {q(patch['question_text'])}")
    if "correct_answer" in patch:
        sets.append(f"correct_answer = {q(patch['correct_answer'])}")
    if "incorrect_answers" in patch:
        sets.append(f"incorrect_answers = {jsonb(patch['incorrect_answers'])}")
    sets.append("quality_status = 'repaired_ka'")
    sets.append("in_production = true")
    sets.append("is_active = true")
    sets.append("updated_at = now()")
    lines.append(f"-- {row['question_text'][:90]}")
    lines.append(f"UPDATE public.questions SET {', '.join(sets)} WHERE id = {q(qid)};")

lines += ["", "-- ── 3. flagged for a Georgian editor, left in production ─────────────", ""]

for qid in sorted(flag, key=lambda i: by_id[i]["question_text"]):
    row = by_id[qid]
    lines.append(f"-- {row['question_text'][:90]}")
    lines.append(f"--   {flag[qid][:150]}")
    lines.append(
        "UPDATE public.questions SET quality_status = 'needs_review', updated_at = now() "
        f"WHERE id = {q(qid)};"
    )

lines += [
    "",
    "COMMIT;",
    "",
    "-- After this migration:",
    f"--   {len(retire)} questions retired",
    f"--   {len(rewrite)} questions repaired and returned to production",
    f"--   {len(flag)} questions flagged for review and left in production",
    "",
]

OUT.write_text("\n".join(lines))
print(f"wrote {OUT.relative_to(HERE.parent.parent)} ({len(lines)} lines)")
