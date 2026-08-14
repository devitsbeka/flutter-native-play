#!/usr/bin/env python3
"""Re-emit the migration as a few bulk statements instead of 1,713 single-row ones.

The verbose migration is 1.4 MB, which is fine for a file in the repo and far
too big to paste into the Supabase SQL editor. Almost none of that is data: the
same 14-line SET clause repeats 1,713 times. Folding the rows into
UPDATE ... FROM (VALUES ...) leaves only the text that actually differs.

The COALESCE on the original_* columns still behaves: in Postgres every SET
expression is evaluated against the pre-UPDATE row, so a row that already has an
original keeps it and a row that does not gets the text being replaced.

Reads the verbose migration and rewrites it, so the two cannot drift.
"""
import json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'migration.sql'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'question-repair.sql'

src = open(SRC).read()

retire = re.findall(
    r"UPDATE public\.questions SET is_active = false, in_production = false, "
    r"quality_status = '(retired_[a-z_]+)', updated_at = now\(\) WHERE id = '([^']+)';", src)

rewrite = re.findall(
    r"UPDATE public\.questions SET\n"
    r"    question_text = '(.*?)',\n"
    r"    correct_answer = '(.*?)',\n"
    r"    incorrect_answers = '(.*?)'::jsonb,\n"
    r".*?"
    r"    in_production = (true|false),\n"
    r"    shorten_status = '([a-z_]+)',\n"
    r".*?WHERE id = '([^']+)';", src, re.S)

assert retire, 'no retire statements parsed'
assert rewrite, 'no rewrite statements parsed'

def lit(s):
    return "'" + s + "'"          # already escaped in the source file

out = ["""-- English question bank repair — paste-ready.
--
-- Identical in effect to supabase/migrations/20260813233500_question_repair_batch1.sql,
-- rewritten as bulk statements so it fits the SQL editor. One transaction: it
-- either all applies or none of it does.
--
-- Nothing is deleted. Retired rows are deactivated and can be brought back with
-- a single UPDATE. Every rewritten row keeps its previous text in the
-- original_* columns, so any individual change can be reverted.
--
-- Safe to run twice: the row ids are fixed and COALESCE keeps the first
-- original it saw.

BEGIN;
"""]

# ── 1. retirements, grouped by reason ─────────────────────────────────────
by_reason = {}
for reason, qid in retire:
    by_reason.setdefault(reason, []).append(qid)

REASON = {
    'retired_duplicate': 'near-identical twins; the better-formed copy survives',
    'retired_duplicate_conflicting': 'twins whose correct answers disagreed; the correct copy survives',
    'retired_unfixable': 'no correct question underneath — invented premise, unverifiable, or several true answers',
}
for reason, ids in sorted(by_reason.items()):
    out.append(f"\n-- {len(ids)} retired: {REASON.get(reason, reason)}\n")
    out.append("UPDATE public.questions SET\n"
               "    is_active = false,\n"
               "    in_production = false,\n"
               f"    quality_status = '{reason}',\n"
               "    updated_at = now()\n"
               "  WHERE id IN (\n")
    out.append(',\n'.join(f"    '{i}'" for i in ids))
    out.append("\n);\n")

# ── 2. rewrites, split by where they land ─────────────────────────────────
for to_prod, title, note in (
    ('true', 'returned to production',
     'These ask the same thing in fewer characters. They were already being served.'),
    ('false', 'held in the Library for review',
     'These ask something different: the original could not be shortened without\n'
     '-- losing its point, so it was replaced with a better question on the same subject.'),
):
    rows = [r for r in rewrite if r[3] == to_prod]
    if not rows:
        continue
    out.append(f"\n\n-- {len(rows)} {title}\n-- {note}\n")
    out.append("UPDATE public.questions AS q SET\n"
               "    question_text = v.question_text,\n"
               "    correct_answer = v.correct_answer,\n"
               "    incorrect_answers = v.incorrect_answers,\n"
               "    original_question_text = COALESCE(q.original_question_text, q.question_text),\n"
               "    original_correct_answer = COALESCE(q.original_correct_answer, q.correct_answer),\n"
               "    original_incorrect_answers = COALESCE(q.original_incorrect_answers, q.incorrect_answers),\n"
               f"    in_production = {to_prod},\n"
               f"    shorten_status = '{rows[0][4]}',\n"
               f"    answer_shorten_status = '{rows[0][4]}',\n"
               "    quality_status = NULL,\n"
               "    quality_issues = NULL,\n"
               "    last_quality_check = now(),\n"
               "    updated_at = now()\n"
               "  FROM (VALUES\n")
    out.append(',\n'.join(
        f"    ('{qid}'::uuid, {lit(q)}, {lit(c)}, {lit(w)}::jsonb)"
        for q, c, w, _tp, _st, qid in rows))
    out.append("\n  ) AS v(id, question_text, correct_answer, incorrect_answers)\n"
               "  WHERE q.id = v.id;\n")

out.append("\nCOMMIT;\n")
open(OUT, 'w').write(''.join(out))

import os
print(f'{OUT}: {os.path.getsize(OUT)/1024:.0f} KB '
      f'(from {os.path.getsize(SRC)/1024:.0f} KB), '
      f'{sum(len(v) for v in by_reason.values())} retired, {len(rewrite)} rewritten')
