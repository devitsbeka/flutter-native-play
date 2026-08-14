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
