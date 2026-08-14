# Question repair pipeline

Turns the audit findings into a reviewable Supabase migration. Nothing here
writes to production — every question the migration touches ends up in the
**Library** (`in_production = false`) for one review pass in Question Studio,
then gets promoted with the existing bulk action.

## Files

| | |
|---|---|
| `build-worklist.py` | Decides what to retire and what to rewrite → `worklist.json` |
| `print-batch.py` | Prints one batch of the rewrite queue in a compact form |
| `rewrites.jsonl` | The rewritten questions, one JSON object per line |
| `build-migration.py` | Validates the rewrites, emits `migration.sql` |
| `build-image-questions.py` | Resolves photo subjects to verified Wikipedia images → `image-questions.json` |
| `build-image-sql.py` | Validates those and emits `image-questions.sql` |

All four expect `en_raw.jsonl` and `categories.json` in the working directory.
Regenerate them with `scripts/audit-questions.mjs` or:

```sh
curl -s "$VITE_SUPABASE_URL/rest/v1/questions?select=*&language=eq.en&order=id&limit=1000&offset=0" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" | jq -c '.[]' >> en_raw.jsonl   # repeat per page
```

## Two dispositions

**Retire** — `is_active = false, in_production = false`, and a
`quality_status` of `retired_duplicate`, `retired_duplicate_conflicting` or
`retired_unfixable`. Nothing is deleted, so bringing one back is a single
`UPDATE`. Three reasons qualify:

- *duplicate* — a near-identical twin exists; the better-formed copy survives.
- *duplicate_conflicting* — twins whose correct answers disagreed. The keeper
  is chosen by hand, not by score, because the structurally nicer copy is
  sometimes the wrong one (`676e1e4c` marks `2πr` as the area of a circle and
  offers `πr²` as a distractor; its twin `601ef0a7` has it right).
- *unfixable* — no correct question underneath: an invented premise, an
  unverifiable attribution, or several true options.

**Rewrite** — the question is repaired and staged in the Library. The original
text is preserved in `original_question_text` / `original_correct_answer` /
`original_incorrect_answers`, so the studio can show a before/after and a bad
call can be reverted per question.

## Duplicate clustering

Two passes over content-word Jaccard similarity:

1. ≥ 0.70 on wording alone.
2. ≥ 0.45 when the correct answers already agree — this catches
   "How many bones are in an adult human **body**/**skeleton**?", which a single
   threshold leaves in three separate clusters.

Both passes refuse to merge when the words that *differ* between two questions
are rare across the bank (document frequency ≤ 6). A rare differing word is the
subject, not filler: without this guard, "human heart" merges with "**giraffe's**
heart" (both answer four) and "**Gosling** created which language" merges with
"what year was **C++** created". Being conservative keeps a duplicate; being
loose deletes a distinct question, which is the worse error.

`PROTECT` and `FORCE_KEEP` in `build-worklist.py` hold the pairs and keepers
decided by reading them.

## Rewrite targets

Derived from what the game renders, not from the config constants:

| | limit | why |
|---|---|---|
| Question | **≤ 70 chars** | `quiz-question-card.tsx:50-56` stops shrinking at 18px past 60 chars; there is no clamp, so a longer question pushes the answers into a scroll region |
| Answer | **≤ 20 chars**, hard fail past **48** | `quiz-answer-button.tsx:140-154` is `line-clamp-2` — a real ellipsis. TV mode's 2-column grid clips soonest, at roughly 48 |
| Answer spread | ≤ 8 chars | matches `MAX_ANSWER_LENGTH_DIFF`; a correct answer visibly longer than every distractor is guessable without knowing it |

`build-migration.py` fails the build on: question over 70, missing `?`, not
exactly 4 options, duplicate options, non-Latin characters, an answer over 48,
or the correct answer appearing in the stem. It warns rather than fails on an
answer between 21 and 48 characters — a proper noun like
*Philosophical Investigations* or *Grenfell Tower* cannot be shortened without
making it wrong, and 48 is where it starts to clip.

Polarity answers (`before`, `after`, `yes`, `no`, `same`) are exempt from the
answer-in-question check: "Did NATO expand before or after the USSR fell?" has
to name both.

## Adding rewrites

```sh
python3 print-batch.py 3 60     # batch 3, 60 questions
# append results to rewrites.jsonl, one object per line:
#   {"id":"018ab763","q":"..."}                        question only
#   {"id":"029011b1","c":"...","w":["..","..",".."]}   answers only
#   {"id":"03ba6b1d","q":"...","c":"...","w":[...]}    both
#   {"id":"07a7b0fd","skip":"why this is a false positive"}
python3 build-migration.py      # validates, writes migration.sql
```

Omitted fields keep the original value, so a question-only fix does not disturb
answers that were already fine.

## Applying

Copy `migration.sql` into `supabase/migrations/<timestamp>_question_repair.sql`
and let it deploy, or paste it into the Supabase SQL editor. It runs in a
single transaction. Afterwards, review the Library tab in Question Studio and
promote.

To undo everything:

```sql
UPDATE public.questions SET
    question_text = COALESCE(original_question_text, question_text),
    correct_answer = COALESCE(original_correct_answer, correct_answer),
    incorrect_answers = COALESCE(original_incorrect_answers, incorrect_answers),
    is_active = true, in_production = true
  WHERE quality_status LIKE 'retired_%' OR shorten_status = 'pending_review';
```

## Photo questions

A photo question is a row with an `image_url` and nothing else new: every
gameplay surface already passes `hideQuestionText={!!image_url}`, so the card
renders the picture and four buttons with no visible stem.

`question_text` is still written, for two reasons. The column is `NOT NULL`,
and `quiz-question-card.tsx` computes
`effectiveHideText = hideQuestionText && !imageFailed` — a player whose image
fails to load gets the text back instead of four unlabelled buttons. So the
fallback stem has to read sensibly on its own ("Which animal is shown?").

Two things the builder does that are not obvious:

- It asks the API for a **960 px thumbnail**, not the original. Several of
  these originals are tens of megabytes; the existing Georgian photo questions
  use 960px thumbs for the same reason.
- It **batches 20 titles per request**. Wikimedia rate-limits, and the first
  version — one lookup plus one HEAD per subject — lost 27 of 50 subjects to
  429s that look exactly like dead URLs. Batching moves the lookup to three
  requests and leaves the throttle budget for verifying the images themselves.

Every URL is confirmed to return `200` with an `image/*` content type before
it is written out, because a wrong path does not fail loudly — it silently
degrades the question to text-only, which for a photo question means a stem
that gives the answer away.

```sh
python3 build-image-questions.py    # -> image-questions.json (+ image-thumbs.json cache)
python3 build-image-sql.py          # -> image-questions.sql
```

`build-image-sql.py` refuses to emit anything if a question is over 70
characters, an answer is over 48, an option set has duplicates, or two subjects
resolved to the same picture. The insert is keyed `WHERE NOT EXISTS` on
`image_url`, so running it twice does not duplicate the batch.

## The paste-ready file

`build-compact-sql.py` re-emits `migration.sql` as five bulk statements instead
of 1,713 single-row ones:

```sh
python3 build-compact-sql.py migration.sql question-repair.sql
```

The verbose migration is 1.4 MB, nearly all of it the same 14-line `SET` clause
repeated once per row. Folding the rows into `UPDATE ... FROM (VALUES ...)`
leaves only the text that differs and brings it to 308 KB, which pastes into the
Supabase SQL editor.

Both were applied to separate schemas of a Postgres seeded with all 7,839 live
English rows and the resulting tables compared column by column: **0 rows
differ**. Running the compact file a second time is also safe — the ids are
fixed and `COALESCE` keeps the first original it saw.

`COALESCE(q.original_question_text, q.question_text)` still does the right thing
in the bulk form: Postgres evaluates every `SET` expression against the
pre-`UPDATE` row, so a row that already has an original keeps it and a row that
does not gets the text being replaced.
