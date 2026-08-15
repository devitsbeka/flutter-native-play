#!/usr/bin/env python3
"""Turn review-flagged.json into the migration that clears the review queue.

Run:  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration-4.py

Batches 1 and 2 left 260 questions at quality_status = 'needs_review' and in
production. That status was never meant to be permanent — it marked a claim
this pass could not verify, or a question with more than one defensible answer.
This is the read of all 260, one decision each:

  retire        the fact is wrong, the term is invented, or the stem cannot be
                repaired without inventing content
  rewrite       a targeted fix exists — tighten the stem, swap the wrong answer
                that was as correct as the right one, or correct the answer
  unflag        reviewed and sound; the flag came off a misreading or a pairing
                that turns out not to collide
  recategorise  the question is fine, the category is wrong
  editor        genuinely needs a Georgian specialist; left flagged and left in
                production, which is where it already was

Rewrites are checked against the limits gameplay enforces, not the card's
render limits: isValidQuestionLength drops anything over 70 characters of
question or 20 per option before a game ever sees it, so a "fix" past those
would quietly delete the question instead of repairing it.
"""

import json
import os
import pathlib
import sys
import urllib.request
from collections import Counter

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260819120000_question_review_ka.sql"
DECISIONS = HERE / "review-flagged.json"

# src/constants/questionQuality.ts
MAX_QUESTION = 70
MAX_ANSWER = 20

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.\n"
        "  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration-4.py"
    )


def get(path):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


rows, page = [], 1000
for offset in range(0, 20000, page):
    batch = get(
        "questions?select=id,question_text,correct_answer,incorrect_answers,category_id,quality_status"
        f"&language=eq.ka&order=id&offset={offset}&limit={page}"
    )
    rows.extend(batch)
    if len(batch) < page:
        break

categories = {c["category_id"]: c["id"] for c in get("categories?select=id,category_id&language=eq.ka")}
by_short = {q["id"][:8]: q for q in rows}
flagged = {q["id"][:8] for q in rows if q["quality_status"] == "needs_review"}

decisions = json.loads(DECISIONS.read_text())
print(f"{len(decisions)} decisions · {len(flagged)} questions currently flagged")

# ── the decisions have to cover the queue, exactly once each ───────────────
problems = []
seen = Counter(d["id"] for d in decisions)
for qid, n in seen.items():
    if n > 1:
        problems.append(f"{qid}: decided {n} times")
missing = flagged - set(seen)
if missing:
    problems.append(f"{len(missing)} flagged questions have no decision: {sorted(missing)[:10]}")
for d in decisions:
    if d["id"] not in by_short:
        problems.append(f"{d['id']}: not a live Georgian question")

# ── a rewrite that breaks the gameplay limits would delete the question ────
def options_of(row, patch):
    wrong = patch.get("incorrect_answers")
    if wrong is None:
        wrong = row["incorrect_answers"]
        if isinstance(wrong, str):
            wrong = json.loads(wrong)
    return [patch.get("correct_answer", row["correct_answer"])] + list(wrong)


for d in decisions:
    if d["action"] != "rewrite" or d["id"] not in by_short:
        continue
    row, patch = by_short[d["id"]], d["fix"]
    text = patch.get("question_text", row["question_text"])
    if len(text) > MAX_QUESTION:
        problems.append(f"{d['id']}: rewritten question {len(text)} chars — gameplay drops it")
    options = options_of(row, patch)
    if len(options) != 4:
        problems.append(f"{d['id']}: {len(options)} options")
    if len({o.strip() for o in options}) != 4:
        problems.append(f"{d['id']}: repeats an option: {options}")
    for o in options:
        if len(o) > MAX_ANSWER:
            problems.append(f"{d['id']}: option {len(o)} chars — gameplay drops it: {o}")

for d in decisions:
    if d["action"] == "recategorise" and d["fix"]["category"] not in categories:
        problems.append(f"{d['id']}: no Georgian category {d['fix']['category']}")

if problems:
    print("\nNot writing the migration:")
    for p in problems:
        print("  " + p)
    sys.exit(1)

counts = Counter(d["action"] for d in decisions)
print("  " + " · ".join(f"{k} {v}" for k, v in counts.most_common()))
extra = [d["id"] for d in decisions if d["id"] not in flagged]
if extra:
    print(f"\n{len(extra)} of these were not flagged — questions the review reached through a flagged one:")
    for e in extra:
        print(f"  {e}  {by_short[e]['question_text'][:60]}")


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def jsonb(values):
    return q(json.dumps(list(values), ensure_ascii=False)) + "::jsonb"


lines = [
    "-- Georgian question bank: the review queue, read and cleared.",
    "--",
    "-- Generated by scripts/question-repair-ka/build-migration-4.py from",
    "-- review-flagged.json beside it. Regenerate rather than editing this by hand.",
    "--",
    "-- Batches 1 and 2 left 260 questions at quality_status = 'needs_review' and",
    "-- in production. The status marked a claim that pass could not verify, or a",
    "-- question with more than one defensible answer — not a question it had found",
    "-- wrong. This is the read of all 260.",
    "--",
    "-- What the read kept finding, in rough order of how often:",
    "--",
    "--   * an invented fact. A title no author wrote, a dish no region cooks, an",
    "--     epithet nobody uses. „ვეფხვის ქურდი“, „ქაქლიბი“, „the green sport“.",
    "--     These are retired: there is nothing to repair.",
    "--",
    "--   * a wrong answer sitting among the options as a distractor. Salmon under",
    "--     „which fish lives in fresh water“, the Oort cloud under „where do",
    "--     short-period comets come from“. Most of these are repaired by replacing",
    "--     the one distractor, which keeps the question.",
    "--",
    "--   * a stem that asks less than it means. „The oldest organism“ where a tree",
    "--     was meant, „the biggest snake“ where the heaviest was. Repaired by",
    "--     saying it.",
    "--",
    "-- Rewrites are inside the limits gameplay enforces — 70 characters of",
    "-- question, 20 per option — because isValidQuestionLength drops anything past",
    "-- them before a game sees it. A repair that overshot would delete the",
    "-- question instead of fixing it.",
    "--",
    "-- Every rewrite keeps its original in original_question_text /",
    "-- original_correct_answer / original_incorrect_answers.",
    "",
    "BEGIN;",
    "",
    "-- ── retired ──────────────────────────────────────────────────────────",
    "",
]

order = {"retire": 0, "rewrite": 1, "unflag": 2, "recategorise": 3, "editor": 4}
retire = [d for d in decisions if d["action"] == "retire"]
rewrite = [d for d in decisions if d["action"] == "rewrite"]
unflag = [d for d in decisions if d["action"] == "unflag"]
recat = [d for d in decisions if d["action"] == "recategorise"]
editor = [d for d in decisions if d["action"] == "editor"]

for d in sorted(retire, key=lambda d: by_short[d["id"]]["question_text"]):
    row = by_short[d["id"]]
    lines.append(f"-- {row['question_text'][:88]}")
    lines.append(f"--   {d['note'][:150]}")
    lines.append(
        "UPDATE public.questions SET is_active = false, in_production = false, "
        f"quality_status = 'retired_ka_repair', updated_at = now() WHERE id = {q(row['id'])};"
    )

lines += ["", "-- ── repaired, and the flag cleared ───────────────────────────────────", ""]

for d in sorted(rewrite, key=lambda d: by_short[d["id"]]["question_text"]):
    row, patch = by_short[d["id"]], d["fix"]
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
    sets += ["quality_status = 'repaired_ka'", "in_production = true", "is_active = true", "updated_at = now()"]
    lines.append(f"-- {row['question_text'][:88]}")
    lines.append(f"--   {d['note'][:150]}")
    lines.append(f"UPDATE public.questions SET {', '.join(sets)} WHERE id = {q(row['id'])};")

lines += ["", "-- ── reviewed and sound; the flag comes off ───────────────────────────", ""]

for d in sorted(unflag, key=lambda d: by_short[d["id"]]["question_text"]):
    row = by_short[d["id"]]
    lines.append(f"-- {row['question_text'][:88]}")
    lines.append(f"--   {d['note'][:150]}")
    lines.append(
        "UPDATE public.questions SET quality_status = NULL, quality_issues = NULL, "
        f"updated_at = now() WHERE id = {q(row['id'])};"
    )

lines += ["", "-- ── right question, wrong category ───────────────────────────────────", ""]

for d in sorted(recat, key=lambda d: by_short[d["id"]]["question_text"]):
    row = by_short[d["id"]]
    lines.append(f"-- {row['question_text'][:88]}")
    lines.append(f"--   {d['note'][:150]}")
    lines.append(
        f"UPDATE public.questions SET category_id = {q(categories[d['fix']['category']])}, "
        f"quality_status = NULL, quality_issues = NULL, updated_at = now() WHERE id = {q(row['id'])};"
    )

lines += [
    "",
    "-- ── left for a Georgian editor ───────────────────────────────────────",
    "--",
    "-- These stay flagged and stay in production, which is where they already",
    "-- were. Each is an attribution this pass could neither confirm nor refute:",
    "-- a title, a dedication, a fresco. Retiring them on a hunch would lose",
    "-- questions that may be perfectly good.",
    "--",
]
for d in sorted(editor, key=lambda d: by_short[d["id"]]["question_text"]):
    row = by_short[d["id"]]
    lines.append(f"--   {d['id']}  {row['question_text'][:70]}")
    lines.append(f"--     {d['note'][:140]}")

lines += [
    "",
    "COMMIT;",
    "",
    "-- After this migration:",
    f"--   {len(retire)} retired",
    f"--   {len(rewrite)} repaired and returned to production",
    f"--   {len(unflag)} reviewed and unflagged",
    f"--   {len(recat)} moved to the right category",
    f"--   {len(editor)} left flagged for a Georgian editor",
    "",
]

OUT.write_text("\n".join(lines))
print(f"\nwrote {OUT.relative_to(HERE.parent.parent)} ({len(lines)} lines)")
