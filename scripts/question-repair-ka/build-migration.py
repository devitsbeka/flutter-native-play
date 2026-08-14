#!/usr/bin/env python3
"""Turn the review files in this directory into one SQL migration.

Run:  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration.py

Inputs, all in this directory:

  dup_decisions.json   duplicate clusters resolved by hand: which copy survives,
                       and which pairs only look like duplicates
  shorten.json         id -> shorter question_text, for stems that break the card
  answer_fixes.json    id -> replacement options, where shortening the stem was
                       not enough
  <category>.json      findings from reading the bank, one file per category,
                       plus _mechanical.json for the sweeps that run over all of it

Each finding is {id, kind, note} plus either "fix" (a partial row) or "action"
("retire" or "flag").

Retire beats rewrite. A question can appear in a category file as a rewrite and
in the duplicate resolution as a retirement — the English repair hit exactly
that and silently revived three rows, because the rewrite ran second.

Every rewrite copies the current text into original_question_text /
original_correct_answer / original_incorrect_answers first, so the studio can
show a before and after, and a bad call can be reverted one row at a time.
"""

import json
import os
import pathlib
import sys
import urllib.request

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / "supabase" / "migrations" / "20260815120000_question_repair_ka.sql"

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.\n"
        "  set -a && . ./.env && set +a && python3 scripts/question-repair-ka/build-migration.py"
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
# The review files carry the eight-character prefixes the studio shows.
by_short = {q["id"][:8]: q["id"] for q in questions}


def full(short):
    if short in by_id:
        return short
    return by_short.get(short)


def options(q):
    wrong = q["incorrect_answers"]
    if isinstance(wrong, str):
        wrong = json.loads(wrong)
    return [str(q["correct_answer"])] + [str(w) for w in wrong]


# ── collect ───────────────────────────────────────────────────────────────
retire = {}   # id -> reason
rewrite = {}  # id -> {column: value}
flag = {}     # id -> reason


def add_rewrite(qid, patch):
    rewrite.setdefault(qid, {}).update(patch)


resolved = HERE / "duplicates-resolved.json"
if not resolved.exists():
    sys.exit(
        "duplicates-resolved.json is missing — run\n"
        "  python3 scripts/question-repair-ka/resolve-duplicates.py\n"
        "first; it is what turns dup_decisions.json into per-row retirements."
    )
for qid, entry in json.loads(resolved.read_text())["retire"].items():
    if qid in by_id:
        retire[qid] = f"{entry['why']} (kept {entry['survivor'][:8]})"

for short, text in json.loads((HERE / "shorten.json").read_text()).items():
    qid = full(short)
    if qid:
        add_rewrite(qid, {"question_text": text})

for short, patch in json.loads((HERE / "answer_fixes.json").read_text()).items():
    qid = full(short)
    if qid:
        add_rewrite(qid, patch)

for path in sorted(HERE.glob("*.json")):
    if path.name in {"dup_decisions.json", "shorten.json", "answer_fixes.json", "duplicates-resolved.json"}:
        continue
    for f in json.loads(path.read_text()):
        qid = full(f["id"])
        if not qid:
            print(f"  skipping {f['id']}: no longer in the bank")
            continue
        if f.get("action") == "retire":
            retire[qid] = f["note"]
        elif f.get("action") == "flag":
            flag[qid] = f["note"]
        if "fix" in f:
            add_rewrite(qid, f["fix"])

# Retire beats rewrite, always.
for qid in retire:
    rewrite.pop(qid, None)
    flag.pop(qid, None)

print(f"retire {len(retire)} · rewrite {len(rewrite)} · flag {len(flag)}")


# ── emit ──────────────────────────────────────────────────────────────────
def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def jsonb(values):
    return q(json.dumps(list(values), ensure_ascii=False)) + "::jsonb"


lines = [
    "-- Georgian question bank repair.",
    "--",
    "-- Generated by scripts/question-repair-ka/build-migration.py from the review",
    "-- files beside it. Regenerate rather than editing this by hand.",
    "--",
    "-- Three things happen, in this order:",
    "--",
    "--   1. Duplicates and unanswerable questions are retired: is_active = false",
    "--      and in_production = false. Nothing is deleted, so any row can be",
    "--      brought back with a single UPDATE. Where a duplicate was retired, the",
    "--      surviving twin is named above it.",
    "--",
    "--   2. Repaired questions go straight back to production. Every one of these",
    "--      rows is already being served; a shorter phrasing of the same question,",
    "--      or a spelling that is no longer half Hebrew, cannot be worse than what",
    "--      is live right now.",
    "--",
    "--   3. Questions that need a Georgian editor rather than a rewrite are marked",
    "--      quality_status = 'needs_review' and LEFT IN PRODUCTION. These are facts",
    "--      this pass could not verify, not facts it found wrong.",
    "--",
    "-- Every rewrite keeps the original in original_question_text /",
    "-- original_correct_answer / original_incorrect_answers.",
    "--",
    "-- Retire wins over rewrite where a row appears in both.",
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
    sets += ["in_production = true", "is_active = true", "updated_at = now()"]
    lines.append(f"-- {row['question_text'][:90]}")
    lines.append("UPDATE public.questions SET " + ", ".join(sets) + f" WHERE id = {q(qid)};")

lines += ["", "-- ── 3. flagged for a Georgian editor, still in production ───────────", ""]

for qid in sorted(flag, key=lambda i: by_id[i]["question_text"]):
    row = by_id[qid]
    lines.append(f"-- {row['question_text'][:90]}")
    lines.append(f"--   {flag[qid][:150]}")
    lines.append(
        "UPDATE public.questions SET quality_status = 'needs_review', "
        f"quality_issues = {q(json.dumps([flag[qid]], ensure_ascii=False))}::jsonb, "
        f"updated_at = now() WHERE id = {q(qid)};"
    )

lines += [
    "",
    "-- ── 4. whitespace, over the whole Georgian bank ─────────────────────",
    "--",
    "-- Five stems and seven options carry a leading or trailing space, and one",
    "-- option has a double space inside it. None of this is visible in the studio,",
    "-- and all of it counts against the character budget the card is sized to. Done",
    "-- as a sweep rather than row by row so the same rows cannot drift back.",
    "",
    "UPDATE public.questions",
    "SET question_text = regexp_replace(btrim(question_text), '\\s{2,}', ' ', 'g'),",
    "    correct_answer = regexp_replace(btrim(correct_answer), '\\s{2,}', ' ', 'g'),",
    "    incorrect_answers = (",
    "      SELECT jsonb_agg(regexp_replace(btrim(v), '\\s{2,}', ' ', 'g') ORDER BY ord)",
    "      FROM jsonb_array_elements_text(incorrect_answers) WITH ORDINALITY AS t(v, ord)",
    "    ),",
    "    updated_at = now()",
    "WHERE language = 'ka'",
    "  AND (question_text <> regexp_replace(btrim(question_text), '\\s{2,}', ' ', 'g')",
    "    OR correct_answer <> regexp_replace(btrim(correct_answer), '\\s{2,}', ' ', 'g')",
    "    OR EXISTS (",
    "         SELECT 1 FROM jsonb_array_elements_text(incorrect_answers) v",
    "         WHERE v <> regexp_replace(btrim(v), '\\s{2,}', ' ', 'g')));",
    "",
    "COMMIT;",
    "",
]

OUT.write_text("\n".join(lines))
print(f"wrote {OUT} ({len(lines)} lines)")

# ── what the bank looks like afterwards ───────────────────────────────────
after = []
for row in questions:
    if not row["in_production"] or row["id"] in retire:
        continue
    patch = rewrite.get(row["id"], {})
    text = patch.get("question_text", row["question_text"])
    opts = options(row)
    if "correct_answer" in patch:
        opts[0] = patch["correct_answer"]
    if "incorrect_answers" in patch:
        opts = [opts[0]] + list(patch["incorrect_answers"])
    after.append((row["id"], text, opts))

print()
print(f"in production        : {len(after)}   (from {sum(1 for r in questions if r['in_production'])})")
print(f"  question over 90   : {sum(1 for _, t, _ in after if len(t) > 90)}")
print(f"  question over 70   : {sum(1 for _, t, _ in after if len(t) > 70)}")
print(f"  answer over 48     : {sum(1 for _, _, o in after if max(len(a) for a in o) > 48)}")
print(f"  answer over 20     : {sum(1 for _, _, o in after if max(len(a) for a in o) > 20)}")
print(f"  empty stem         : {sum(1 for _, t, _ in after if not t.strip())}")
print(f"  duplicate options  : {sum(1 for _, _, o in after if len({a.strip() for a in o}) != 4)}")
print(f"  untrimmed option   : {sum(1 for _, _, o in after if any(a != a.strip() for a in o))}")
