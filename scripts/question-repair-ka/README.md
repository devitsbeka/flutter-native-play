# Georgian question repair

The pipeline that produced `supabase/migrations/20260815120000_question_repair_ka.sql`.

## Running it

```bash
set -a && . ./.env && set +a

node scripts/audit-questions.mjs --lang ka --csv /tmp/ka.csv   # what is wrong
python3 scripts/question-repair-ka/resolve-duplicates.py       # -> duplicates-resolved.json
python3 scripts/question-repair-ka/build-migration.py          # -> the migration
```

The audit reads with the publishable anon key, which is all it needs — the
`questions` table already exposes active rows to anonymous clients.

## The files

| file | what it holds |
|---|---|
| `dup_decisions.json` | duplicate clusters resolved by hand: which copy survives, and which pairs only *look* like duplicates |
| `duplicates-resolved.json` | generated — every retirement, one row per id |
| `shorten.json` | id → a stem short enough for the card |
| `answer_fixes.json` | id → replacement options, where a shorter stem was not enough |
| `_mechanical.json` | findings from sweeps that run over the whole bank |
| `georgian_*.json` | findings from reading a category, one file per category |

A finding is `{id, kind, note}` plus either `fix` (a partial row) or `action`
(`retire` or `flag`). `id` may be the eight-character prefix the studio shows.

**Retire beats rewrite.** A question can appear in a category file as a rewrite
and in the duplicate resolution as a retirement. The English repair hit exactly
that and silently revived three rows, because the rewrite ran second.

## Applying it

Nothing in CI applies Supabase migrations — `deploy.yml` ships the frontend to
Cloudflare, and `pr-checks.yml` runs migrations only against a throwaway
Postgres. Merging the migration changes no question. It has to be run by hand:

```
Supabase SQL editor -> paste supabase/migrations/20260815120000_question_repair_ka.sql -> run
```

## Verifying it

The migration was checked against a scratch Postgres seeded with all 8,304 live
Georgian rows:

```
retired                    : 250
flagged for an editor      :  53
rewritten                  : 179
in production              : 8053   (from 8303)
  question over 90         : 0
  empty stem               : 0
  answer over 48           : 0
  duplicate option sets    : 0
  stray whitespace         : 0
  non-Georgian scripts     : 0
  retired rows revived     : 0
```

To repeat it, seed a database with the live rows and apply the file; the
queries are in the pull request.

## Rolling it back

Every rewrite keeps the original, so a bad call reverts one row at a time:

```sql
UPDATE public.questions
SET question_text = COALESCE(original_question_text, question_text),
    correct_answer = COALESCE(original_correct_answer, correct_answer),
    incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    original_question_text = NULL,
    original_correct_answer = NULL,
    original_incorrect_answers = NULL
WHERE id = '...';
```

Nothing is deleted, so the whole thing reverts too:

```sql
-- un-retire
UPDATE public.questions SET is_active = true, in_production = true, quality_status = NULL
WHERE quality_status = 'retired_ka_repair';

-- un-rewrite
UPDATE public.questions
SET question_text = original_question_text,
    correct_answer = COALESCE(original_correct_answer, correct_answer),
    incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    original_question_text = NULL,
    original_correct_answer = NULL,
    original_incorrect_answers = NULL
WHERE language = 'ka' AND original_question_text IS NOT NULL;

-- un-flag
UPDATE public.questions SET quality_status = NULL, quality_issues = NULL
WHERE language = 'ka' AND quality_status = 'needs_review';
```

Un-retiring restores 250 rows including the 229 duplicates, so the bank goes
back to serving the same question twice. That is the state it is in today.


## Batch 2 — the hand read of the other forty-one categories

Batch 1 covered what a rule can find bank-wide, plus a fact-check of the four
Georgia-specific categories. Batch 2 is the read of the remaining forty-one,
one findings file per category:

```bash
set -a && . ./.env && set +a
python3 scripts/question-repair-ka/build-migration-2.py
```

It emits `supabase/migrations/20260816120000_question_repair_ka_batch2.sql`
and refuses to write anything whose rewrite would not fit the card — over 90
characters in a stem, over 48 in an option, a repeated option, or an option
count other than four.

`build-migration-2.py` reads every `<category>.json` in this directory **except**
the ones batch 1 consumed (`dup_decisions.json`, `shorten.json`,
`answer_fixes.json`, `duplicates-resolved.json`, `_mechanical.json` and the
four `georgian_*.json` files). Findings whose row is no longer live — retired
by batch 1 — are reported and skipped rather than resurrected.

Rolling batch 2 back:

```sql
UPDATE public.questions
   SET question_text = COALESCE(original_question_text, question_text),
       correct_answer = COALESCE(original_correct_answer, correct_answer),
       incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
       is_active = true, in_production = true, quality_status = NULL
 WHERE language = 'ka'
   AND updated_at >= '2026-08-16'
   AND quality_status IN ('retired_ka_repair', 'repaired_ka', 'needs_review');
```


## Batch 3 — the five collisions batch 2 created

Batch 2 standardised wording, and five of its rewrites landed two questions on
the same stem. The duplicate clustering ran before those rewrites existed, so
it could not have seen them. `20260817120000_question_repair_ka_batch3.sql` is
hand-written — five `UPDATE`s, each naming its survivor in a comment above it:

```
bdbbaa62 -> keep 06b8918f   Zarathustra: ნიცშე vs ფრიდრიხ ნიცშე
841f1c6f -> keep 366affe2   founder of genetics: მენდელი vs გრეგორ მენდელი
15d1709d -> keep 646b1e6b   which element is diamond — same stem, same answer
3e2de5ef -> keep 6668b6e3   Saturn's rings — word-for-word identical
8a2bb0db -> keep e97ae666   subfield of AI — near-identical
```

Rolling it back is the same statement with `updated_at >= '2026-08-17'`.

If a later batch rewrites more stems, re-run the duplicate check **after** it
is applied, not before — that is the gap this batch closes.
