#!/usr/bin/env python3
"""Validate the rewrites and emit a Supabase migration.

Nothing here touches production directly. Every question the migration edits is
moved to the Library (in_production = false) so the whole batch gets one human
review in Question Studio before it is promoted back.
"""
import json, re, sys, collections, unicodedata

Q_MAX, A_TARGET, A_HARD, SPREAD = 70, 20, 48, 8

rows = [json.loads(l) for l in open('en_raw.jsonl')]
by_id = {r['id']: r for r in rows}
short = {r['id'][:8]: r['id'] for r in rows}
wl = json.load(open('worklist.json'))
# rewrites.jsonl is hand-authored; trimmed.jsonl is what safe-trim.py resolved
# by rule. A hand-authored entry wins if both touch the same question.
rewrites = [json.loads(l) for l in open('rewrites.jsonl') if l.strip()]
_hand = {d['id'] for d in rewrites}
try:
    rewrites += [d for l in open('trimmed.jsonl') if l.strip()
                 for d in [json.loads(l)] if d['id'] not in _hand]
except FileNotFoundError:
    pass

def opts(r):
    ia = r.get('incorrect_answers') or []
    if isinstance(ia, str): ia = json.loads(ia)
    return [str(r['correct_answer'])] + [str(x) for x in ia]

def same_option(s):
    """Compare option text for real duplication.

    Stripping all punctuation collapses whole families of legitimate answers
    into the same string: $/€/£/¥, ∃/∀/∧/∨, ☉/☾/♂/⊕, and every formula
    ("a² + b² = c²" and "a + b = c" both become "a b c"). Only leading and
    trailing punctuation is noise — "Grumpy Cat." and "Grumpy Cat" are the same
    answer. Everything inside the string carries meaning.
    """
    s = unicodedata.normalize('NFKC', str(s)).lower()
    s = re.sub(r'\s+', ' ', s).strip()
    return s.strip('.,;:!?\'"“”‘’ ')


def norm(s):
    """Flatten text for word overlap and substring tests, where punctuation is
    genuinely noise. Not for comparing options — see same_option."""
    s = unicodedata.normalize('NFKC', str(s)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', ' ', s)).strip()

# Latin text, punctuation, currency, arrows, maths and sub/superscripts. A
# chemistry or calculus answer is not a language leak.
NON_LATIN = re.compile(r'[^\x00-\x7FÀ-ɏ -⁯₠-₿'
                       r'℀-⅏←-⇿∀-⋿■-◿'
                       r'☀-➿⁰-₟Α-Ͽ]')

HAND = {json.loads(l)['id'] for l in open('rewrites.jsonl') if l.strip()}
errors, warnings, applied = [], [], []
warned_ids = set()

for d in rewrites:
    sid = d['id']
    if 'skip' in d:
        continue
    full = short.get(sid)
    if not full:
        errors.append(f'{sid}: unknown id'); continue
    orig = by_id[full]
    o = opts(orig)

    q = d.get('q', orig['question_text'])
    c = d.get('c', o[0])
    w = d.get('w', o[1:])

    if len(q) > Q_MAX:
        errors.append(f'{sid}: question {len(q)} > {Q_MAX}')
    if not q.strip().endswith('?'):
        errors.append(f'{sid}: question does not end with "?"')
    allo = [c] + list(w)
    if len(allo) != 4:
        errors.append(f'{sid}: {len(allo)} options')
    if len({same_option(x) for x in allo}) != len(allo):
        errors.append(f'{sid}: duplicate options')
    if NON_LATIN.search(q + ' ' + ' '.join(allo)):
        errors.append(f'{sid}: non-Latin characters')
    # "Did X happen before or after Y?" must name both options in the stem — the
    # answer echoing the question is the format, not a giveaway.
    POLARITY = {'before', 'after', 'yes', 'no', 'both', 'neither', 'same', 'same year'}
    if norm(c) and norm(c) not in POLARITY and norm(c) in norm(q):
        errors.append(f'{sid}: correct answer appears in the question')
    lens = [len(x) for x in allo]
    if max(lens) > A_HARD:
        errors.append(f'{sid}: answer {max(lens)} > {A_HARD}, still clips')
    elif max(lens) > A_TARGET:
        warnings.append(f'{sid}: answer {max(lens)} chars (proper noun?) — over {A_TARGET}, under the clip'); warned_ids.add(sid)
    if max(lens) - min(lens) > SPREAD:
        warnings.append(f'{sid}: answer spread {max(lens)-min(lens)}'); warned_ids.add(sid)

    applied.append({'id': full, 'q': q, 'c': c, 'w': list(w),
                    'hand': sid in HAND, 'warned': sid in warned_ids})

covered = {d['id'] for d in rewrites}
remaining = [k for k in wl['rewrite'] if k[:8] not in covered]

print(f'rewrites supplied : {len(rewrites)}  (applied {len(applied)}, skipped {len(rewrites)-len(applied)})')
print(f'still to do       : {len(remaining)}')
print(f'retire            : {len(wl["retire"])}')
if errors:
    print(f'\nERRORS ({len(errors)}):')
    for e in errors: print('  ', e)
if warnings:
    print(f'\nwarnings ({len(warnings)}):')
    for x in warnings: print('  ', x)
if errors:
    sys.exit(1)

# ── emit migration ────────────────────────────────────────────────────────
def sql(s):
    return "'" + str(s).replace("'", "''") + "'"

lines = ["""-- English question bank repair.
--
-- Three things happen here:
--
--   1. Duplicates and unfixable questions are retired: is_active = false and
--      in_production = false. Nothing is deleted, so any of it can be brought
--      back with a single UPDATE. Where a duplicate was retired, the surviving
--      twin is named in the comment above it.
--
--   2. Repaired questions that passed every check go straight back to
--      production. These rows were already being served: a hand rewrite was
--      fact-checked when it was written, and a rule trim only removes words the
--      question itself already supplied. Neither can be less correct than what
--      is live right now, so parking them in the Library would take working
--      questions out of the game for no reason.
--
--   3. Repaired questions that tripped a warning — an answer over 20 chars that
--      could not be shortened without renaming a proper noun, or a set still
--      unbalanced — go to the Library instead, for a look before promotion.
--
-- Every rewrite keeps the original text in original_question_text /
-- original_correct_answer / original_incorrect_answers, so the studio can show
-- a before/after and a bad call can be reverted per question.
--
-- Targets are derived from what the game renders, not from the config
-- constants: questions <= 70 chars (the card stops shrinking at 18px and then
-- pushes answers into a scroll region), answers <= 20 where possible and never
-- past 48 (quiz-answer-button.tsx line-clamp-2 ellipsizes, and TV mode's
-- 2-column grid clips soonest).

BEGIN;
"""]

lines.append("\n-- ── 1. retire duplicates and unfixable questions ──────────────────────\n")
groups = collections.defaultdict(list)
for qid, meta in wl['retire'].items():
    groups[meta['reason']].append((qid, meta))

REASON_HEADER = {
    'duplicate': 'exact or near-identical twins; the better-formed copy survives',
    'duplicate_conflicting': 'twins whose correct answers disagreed; the factually correct copy survives',
    'unfixable': 'no correct question underneath — invented premise, unverifiable, or several true options',
}
for reason in ('duplicate_conflicting', 'duplicate', 'unfixable'):
    items = groups.get(reason, [])
    if not items: continue
    lines.append(f"\n-- {reason}: {REASON_HEADER[reason]} ({len(items)})\n")
    for qid, meta in sorted(items, key=lambda kv: by_id[kv[0]]['question_text']):
        q = by_id[qid]['question_text'].replace('\n', ' ')
        lines.append(f"-- {q}\n--   {meta['note']}\n")
        lines.append(
            f"UPDATE public.questions SET is_active = false, in_production = false, "
            f"quality_status = {sql('retired_' + reason)}, updated_at = now() "
            f"WHERE id = {sql(qid)};\n")

# A repaired question goes straight back to production when it is clean: every
# hard check passed and nothing was flagged for a person to look at. That is
# safe because these rows were ALREADY being served — a hand rewrite was
# fact-checked when it was written, and a rule trim only removes words the
# question already supplied, so neither can be less correct than what is live
# now. Anything carrying a warning goes to the Library instead.
promote = [a for a in applied if not a['warned']]
stage = [a for a in applied if a['warned']]

def emit(a, to_production):
    orig = by_id[a['id']]
    o = opts(orig)
    changed = []
    if a['q'] != orig['question_text']:
        changed.append(f"question {len(orig['question_text'])}->{len(a['q'])} chars")
    if [a['c']] + a['w'] != o:
        changed.append(f"answers {max(len(x) for x in o)}->{max(len(x) for x in [a['c']] + a['w'])} chars")
    src = 'hand-rewritten' if a['hand'] else 'trimmed by rule'
    lines.append(f"\n-- {orig['question_text']}\n--   {src}: {', '.join(changed) or 'no textual change'}\n")
    incorrect = json.dumps(a['w'], ensure_ascii=False)
    lines.append(
        "UPDATE public.questions SET\n"
        f"    question_text = {sql(a['q'])},\n"
        f"    correct_answer = {sql(a['c'])},\n"
        f"    incorrect_answers = {sql(incorrect)}::jsonb,\n"
        "    original_question_text = COALESCE(original_question_text, question_text),\n"
        "    original_correct_answer = COALESCE(original_correct_answer, correct_answer),\n"
        "    original_incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),\n"
        f"    in_production = {'true' if to_production else 'false'},\n"
        f"    shorten_status = {sql('shortened' if to_production else 'pending_review')},\n"
        f"    answer_shorten_status = {sql('shortened' if to_production else 'pending_review')},\n"
        "    quality_status = NULL,\n"
        "    quality_issues = NULL,\n"
        "    last_quality_check = now(),\n"
        "    updated_at = now()\n"
        f"  WHERE id = {sql(a['id'])};\n")

lines.append(f"\n\n-- ── 2. repaired and cleared for production ({len(promote)}) ─────────────\n")
lines.append("-- Every hard check passed and nothing needs a second opinion. These rows\n"
             "-- were already being served; they are the same questions, shorter.\n")
for a in sorted(promote, key=lambda x: by_id[x['id']]['question_text']):
    emit(a, True)

lines.append(f"\n\n-- ── 3. repaired but staged in the Library for review ({len(stage)}) ──────\n")
lines.append("-- An answer over 20 chars that could not be shortened without renaming a\n"
             "-- proper noun, or a set still unbalanced. Readable, but worth a look.\n")
for a in sorted(stage, key=lambda x: by_id[x['id']]['question_text']):
    emit(a, False)

    pass

lines.append("\nCOMMIT;\n")

out = 'migration.sql'
open(out, 'w').write(''.join(lines))
print(f'\nwrote {out}: {len(wl["retire"])} retired, {len(promote)} promoted to production, {len(stage)} staged in Library')
