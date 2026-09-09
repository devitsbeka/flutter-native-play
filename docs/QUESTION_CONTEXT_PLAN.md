# Question context — from a generated sentence to a real fact

The answer-feedback card (Figma `1154:9157`, shipped in `a2364b7`) shows a line
of context under the verdict. Today that line is **composed from the correct
answer**, not authored:

> `answerFeedback.wrong1` — "The answer was {answer}. Now you know it."

Four phrasings per verdict, picked by a hash of the question id so it stays put
across re-renders (`src/utils/answerContext.ts`). It reads naturally and it is
not a fact. This plan replaces it with real per-question context.

Written against `main` at `a2364b7`. Every number below was measured against
this repo or this project's database, not assumed — the method is in the
appendix so you can re-run it.

> **The card already prefers authored text.** `answerContextLine()` returns
> `input.explanation` outright when it is non-empty and only falls back to the
> generated line. Nothing in `src/components/game/AnswerFeedbackCard.tsx` has
> to change for authored context to appear — the work is entirely in getting a
> value into that prop.

---

## Part 0 — The three facts that shape the whole plan

**1. The character budget is small, and Georgian sets it.**
At 18px on the narrowest common phone, three lines is 130 Latin characters —
but only **86 Georgian**. Georgian is the content language. Part 1.

**2. The work is ~17k questions, not 74k.**
There are 74,391 active questions across seven languages, but they are not
74,391 independent questions: `translated_from` links each translation to its
source (`20260828120000_question_translations.sql:16-22`). Only the source rows
need authoring:

| Rows | Count | What they are |
|---|---|---|
| `en`, `translated_from IS NULL` | 9,015 | The English source bank |
| `ka`, `translated_from IS NULL` | 7,944 | Georgian originals (authored, never translated from English) |
| **Total to author** | **~16,959** | |
| Everything else | ~57,400 | Translations, which carry the context along with the text |

**3. Translations will not backfill themselves.**
`translate-questions/index.ts:264-266` upserts with
`ignoreDuplicates: true` on `(translated_from, language)`. Every row that is
already translated is already there, so a later run **skips it entirely** — a
new column added to the insert reaches new translations only. The ~57k existing
translations need an explicit backfill path. This is the single easiest thing
to get wrong here. Part 4.

---

## Part 1 — The budget

### Method

Not guessed and not taken from the Figma frame. The real Google Sans 400 face
was loaded, the card's exact type spec applied (`18px / 21px line-height /
-0.5px tracking`), and a probe element grown one character at a time at each
device's real content width until it exceeded N lines. Content width is
`viewport − 32px page gutter − 40px card padding`. This is the same method
`shorten-answers/index.ts:6-13` used to derive its 28-character answer limit,
which is the best-documented number in the codebase.

### Result — characters that fit

| Device (content width) | Latin, 2 lines | Latin, 3 lines | German¹, 3 lines | Georgian, 3 lines |
|---|---|---|---|---|
| 375 — SE / mini (303px) | 89 | **130** | 108 | **86** |
| 390 — 12/13/14 (318px) | 94 | 139 | 110 | 87 |
| 430 — Pro Max (358px) | 106 | 160 | 116 | 106 |

¹ Worst-case German: a string of pathological compounds
(`Donaudampfschifffahrtsgesellschaft`…). Ordinary German lands between the
German and Latin columns.

### Recommended limits

Size for the **375px** column — it is the floor, and a limit that only works on
a Pro Max is not a limit.

| Language | Hard cap | Author target | Rationale |
|---|---|---|---|
| `ka` | **85** | ≤ 78 | Georgian glyphs are ~1.5× the advance width of Latin at the same size |
| `de` | **105** | ≤ 95 | Compounds wrap badly and cannot be hyphenated safely |
| `en` `es` `fr` `it` `pt` | **120** | **≤ 110** | 130 is the true ceiling; 10 characters of headroom absorbs a long proper noun |

Two lines is the comfortable read and three the maximum. Aim for **one
sentence**. A fact that needs two sentences is a fact for a different surface.

- [ ] Add these to `src/constants/questionQuality.ts` beside
      `QUESTION_MAX_LENGTH` / `ANSWER_MAX_LENGTH` as
      `EXPLANATION_MAX_LENGTH: Record<string, number>` with a default of 120.
      **Import them in the edge function too** — do not retype the numbers.
      Note the existing limits disagree across 12 call sites (65 / 67 / 70 for
      questions); do not add a 13th disagreement.

> **A caveat worth stating.** Character count is a proxy for rendered width, and
> a poor one across scripts — that is exactly why the table above is per
> language rather than one number. It is still only a proxy: 120 characters of
> capitals is wider than 120 of lowercase. The UI clamp below is what makes the
> proxy safe.

- [ ] Add `line-clamp-3` to the context `<p>` in
      `src/components/game/AnswerFeedbackCard.tsx`. Belt and braces: the cap
      keeps bad data out, the clamp keeps a layout break impossible if one ever
      lands. Cheap, one class.

---

## Part 2 — Schema

House style for this table, read off the four existing derived-content columns:
nullable `TEXT`, **no CHECK constraint** (there is not one in the entire
`questions` table), vocabulary documented in a `COMMENT ON COLUMN`, an index
only where it will be filtered, `ADD COLUMN IF NOT EXISTS`.

```sql
-- supabase/migrations/2026XXXXXXXXXX_question_explanation.sql

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation        text,
  ADD COLUMN IF NOT EXISTS explanation_status text,
  ADD COLUMN IF NOT EXISTS last_explanation   timestamptz;

COMMENT ON COLUMN public.questions.explanation IS
  'One sentence of context shown under the verdict in the answer-feedback card.
   Length is bounded per language in src/constants/questionQuality.ts — ka 85,
   de 105, other Latin 120 — sized to three lines at 18px on a 375px screen.';

COMMENT ON COLUMN public.questions.explanation_status IS
  'Values: authored, generated, rejected, unexplainable, or NULL (not processed).';

-- The generator selects "rows without one", and the admin queue filters by
-- status. Both want this.
CREATE INDEX IF NOT EXISTS questions_explanation_status_idx
  ON public.questions (explanation_status)
  WHERE explanation_status IS NULL OR explanation_status <> 'authored';
```

**Deliberately not copied:** the `pending_*` approval pattern. Nothing has
written those columns since the shortener went direct-apply, and
`QuestionTools.tsx:326-329` says so in a comment — the queue was orphaned and
nobody noticed. Do not inherit a known-dead mechanism. Use direct-apply plus a
status, which is what actually works end to end today.

- [ ] Write the migration.
- [ ] Apply it **through Lovable** — paste the raw file into the SQL editor
      (CLAUDE.md rule 4a; nobody here has CLI access to this project).
- [ ] **Then** regenerate `src/integrations/supabase/types.ts`, and not before.
      CLAUDE.md rule 1: regenerating against a database missing the entitlement
      migrations silently deletes six RPCs and the build fails at two dozen call
      sites that never mention the cause.
      `src/__tests__/repo-invariants.test.ts` catches it — read the message.

---

## Part 3 — Generation

### The function

New edge function `supabase/functions/generate-question-context/`, modelled on
`shorten-questions/index.ts` — the closest working precedent (select a batch of
un-processed rows → one LLM call per batch → validate each result → direct-apply
with a status).

- [ ] `import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts"`.
      **Never a vendor URL.** All 34 LLM-calling functions in this repo go
      through that gateway; it is currently Gemini and the point of it is that
      switching providers is a secrets change. Guard with
      `if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured")`.
- [ ] Model: `aiModel("google/gemini-2.5-flash")` — the canonical name every
      call site writes; `_shared/ai.ts:51-58` absorbs Google's renames.
      Use the `-pro` tier only if flash fails the quality bar in Part 3's pilot.
- [ ] `BATCH_SIZE = 10`, matching both shorteners.
- [ ] Selection: `is_active = true`, `translated_from IS NULL`,
      `explanation_status IS NULL`, `language IN ('en','ka')`. Order by
      `category_id` so a category becomes fully covered before the next starts —
      the same reasoning as `get_untranslated_questions`
      (`20260828120000:31-50`), and it means partial completion is still
      shippable for whole categories.
- [ ] `supabase/config.toml`: `verify_jwt = true` if admin-invoked. If you want
      it cron-driven instead, copy the `x-cron-secret` guard from
      `translate-questions/index.ts:187-190` and set `verify_jwt = false`.

### The prompt contract

The whole difficulty is that this must be *interesting* inside ~110
characters. Instructions that earn their place:

- **One sentence. Never restate the answer as the whole sentence.** "The answer
  is Slack" is what we already have and it is worthless.
- **Add a fact the question did not contain** — a date, a number, a
  consequence, an origin, a surprise. If there is no such fact, say so (see
  `unexplainable` below) rather than padding.
- **No opener throat-clearing.** "Interestingly," / "Did you know" / "In fact,"
  spend 15 of 110 characters on nothing.
- **Write in the row's own language**, not English-then-translate. The row
  carries `language`; pass it. `LANGUAGE_NAMES` in
  `review-question-quality/index.ts:10-19` is the map to copy.
- **Hard character limit in the prompt**, per that language, from the shared
  constant — and validate anyway, because models miss limits.

Give it the question, the correct answer, and the incorrect answers (the
distractors often reveal what the interesting confusion is).

### Validation before write — non-negotiable

`shorten-questions` validates before applying (`isValidShortenedQuestion`,
L34-60) and that is why it is trustworthy. Mirror it:

- [ ] Length ≤ the language's cap. **Reject, do not truncate** — a truncated
      sentence is worse than the generated fallback.
- [ ] Not merely a restatement: reject when the sentence, minus the answer
      string, is under ~25 characters.
- [ ] Contains no question mark (this is a statement).
- [ ] Passes the nonsense check from `shorten-questions:53-57` (unique-character
      count).
- [ ] Language sanity: for `ka`, assert Georgian codepoints are present. There
      is an existing `verify-georgian-grammar` function and a
      `fix-mixed-language-questions` one, which exist because this has gone
      wrong before. `src/__tests__/no-mixed-language.test.ts` guards the UI
      strings; the question bank has no such guard.

Statuses written: `generated` on success, `unexplainable` when the model
declines or fails validation twice. Never leave a row `NULL` after processing it
or the next run will pick it up forever.

### Scale and cost

~16,959 source rows ÷ 10 per batch ≈ **1,700 LLM calls**. Rough token budget:
~350 in / ~60 out per question, so ~6M input and ~1M output tokens total. What
that costs depends entirely on which provider `_shared/ai.ts` resolves to —
check the configured one; do not price it against a provider this repo does not
use.

- [ ] **Pilot first: one category, ~200 questions, both languages.** Read all
      200 by hand. This is a content quality problem, and the only way to know
      whether the prompt produces facts or filler is to read the output. Tune,
      then run the rest.

---

## Part 4 — Translation, and the trap

`translate-questions` fans English out to `ka, de, es, fr, it, pt`
(`index.ts:33`). Its insert lists every column explicitly at L246-260. A column
missing from that list is NULL in every translated row, forever.

- [ ] Add `explanation` to `SourceQuestion` (L55-67).
- [ ] Add it to the prompt's item shape in `buildPrompt` (L92-97) — and tell the
      model the target language's character cap, which differs from the source's.
      A German explanation translated from a 118-character English one will not
      fit.
- [ ] Add it to `TranslatedItem` (L69-74) and `validItem` (L173-184), with the
      same length validation as Part 3.
- [ ] Add it to the insert at L246-260.
- [ ] **Add a backfill mode.** The `ignoreDuplicates: true` upsert at L264-266
      means the ~57,400 already-translated rows are permanently invisible to
      this function. Either:
      - a `mode: "explanations"` branch that selects translated rows where
        `explanation IS NULL` and their source has one, and `UPDATE`s them; or
      - a separate `backfill-question-context` function that does the same.

      Without this, the feature covers new translations only and looks broken in
      six of seven languages.

- [ ] Also add `explanation` to the explicit insert column lists in
      `Flow.tsx:593-605` and `:633-646`, and `useQuestionStudio.ts:253` / `:313`,
      or newly authored questions will lose it at publish time.

---

## Part 5 — The read path

`useTrivia.ts` and `CategoryQuizPage.tsx` contain no `.select()` for questions;
everything funnels through `src/services/questionService.ts`, self-described as
the "GOLDEN STANDARD: Single canonical question-selection pipeline". The select
strings are **inline literals repeated 11 times**, not a shared constant.

- [ ] Add `explanation` to all 11: `questionService.ts` lines **513, 534, 555,
      592** (with `level_number`), **682, 704, 722, 747, 864, 883, 908**
      (without), and **1029** (multi-category VS).
- [ ] While you are in there: extract them into one exported constant. Eleven
      copies of a column list is why this step is a checklist item at all.
- [ ] `RawQuestion` interface — `questionService.ts:94-105`.
- [ ] `formatQuestion()` return — `questionService.ts:281-300`.
- [ ] `FormattedQuestion` interface — `questionService.ts:66-79`.
- [ ] `TriviaQuestion` — `useTrivia.ts:9-25`, and the mapping at L92-113.
- [ ] The **separate local** `TriviaQuestion` in `CategoryQuizPage.tsx:116-127`
      (snake_case there) and its mapping at L369-379.
- [ ] `useTVPoll.ts:759` — the one bypass path with an explicit column list.
      (`TVGameContext.tsx` and the TV modals use `select('*')` and get it free.)

Then, finally, the two lines that light the feature up:

- [ ] `CategoryQuizPage.tsx` — pass `explanation={currentQuestion.explanation}`
      to `<AnswerFeedbackCard>`.
- [ ] `QuizGameScreenProd.tsx` — same.

Nothing else in the card changes. `answerContextLine()` already prefers it.

---

## Part 6 — Review

Approve/reject already exists in three places with three vocabularies
(`QualityReview` for `ai_review_*`, `QuestionTools` for the dead `pending_*`,
`Flow` for freshly generated). Do not build a fourth.

- [ ] Surface `explanation` + `explanation_status` in **QuestionStudio** — add
      to the select at `useQuestionStudio.ts:350` and to `StudioQuestion`
      (L9-25). That is the per-question CRUD browser; an editable field there
      gives you `authored` (a human wrote or fixed it) as a status for free.
- [ ] Optional, only if the pilot shows the model needs supervision at scale: a
      filtered list of `explanation_status = 'generated'` with approve/edit,
      following `QualityReview`'s shape rather than `QuestionTools`'.

---

## Part 7 — Order of work

Each phase is independently shippable and safe to stop after.

1. **Budget constants + UI clamp.** No backend. Ships alone, makes every later
   phase's limit correct. *(Part 1)*
2. **Migration + types regeneration.** No behaviour change. *(Part 2)*
3. **Read path.** Threads a column that is NULL everywhere; the card keeps
   showing generated lines. Ships alone, zero visible change, de-risks the big
   one. *(Part 5)*
4. **Generator + pilot on one category.** Read all 200 by hand. Iterate the
   prompt here, not later. *(Part 3)*
5. **Full source-row run** (~1,700 calls, `en` + `ka` originals). Real context
   appears in two languages. *(Part 3)*
6. **Translation carry + backfill.** The other five languages. *(Part 4)*
7. **Studio field.** Human repair path for the ones the model got wrong.
   *(Part 6)*

---

## Part 8 — Done looks like

- A question with an authored `explanation` shows it under the verdict; one
  without still shows the generated line, and neither path can break the card's
  layout.
- No explanation exceeds its language's cap — assert it in a test over a sample,
  the way `repo-invariants` asserts the things that have actually broken.
- The seven languages agree: a translated row's explanation says the same thing
  its source does.
- A category that has been through the generator is 100% covered, not 80% —
  which is why the generator orders by category.
- Re-running the generator processes zero rows (every processed row has a
  non-NULL status).

---

## Part 9 — Decisions that are yours

1. **Is the generated fallback kept?** Once coverage is high it is arguably
   noise — but it is also what a brand-new question shows before the generator
   next runs. Recommendation: keep it. It costs four strings per language and it
   means the card is never empty.
2. **`unexplainable` questions.** Some questions genuinely have no interesting
   context ("Which is bigger, 3 or 5?"). Do they show the fallback, or nothing?
   Recommendation: fallback.
3. **Who authors the pilot's quality bar?** The prompt in Part 3 is a starting
   point. Somebody has to read 200 candidate sentences and say "this one is
   filler". That judgement cannot be delegated to the model that wrote them.
4. **`ka` originals vs the English bank.** The 7,944 Georgian originals have no
   English counterpart, so they need their own generation pass in Georgian —
   confirmed in the counts, but worth deciding whether they are in scope for
   phase 5 or a later one.

---

## Appendix — re-running the measurements

**Character budget.** Load the real face (the app's own
`index.html` pulls Google Sans 300-600 from Google Fonts), then grow a probe:

```js
const probe = document.createElement('div');
probe.style.cssText =
  "position:fixed;left:-9999px;font-family:'Google Sans',Nunito,sans-serif;" +
  "font-size:18px;line-height:21px;letter-spacing:-0.5px;width:303px";  // 375px device
document.body.appendChild(probe);
let best = 0;
for (let n = 1; n <= sample.length; n++) {
  probe.textContent = sample.slice(0, n);
  if (probe.offsetHeight <= 3 * 21) best = n; else break;
}
```

Confirm the face actually loaded first — `document.fonts.check('400 18px "Google
Sans"')` — or you are measuring the fallback and the numbers will be wrong.

**Row counts.** PostgREST answers with the anon key in `.env`:

```bash
curl -sI "$URL/rest/v1/questions?select=id&language=eq.en&translated_from=is.null" \
  -H "apikey: $ANON" -H "Prefer: count=exact" -H "Range: 0-0" | grep -i content-range
```
