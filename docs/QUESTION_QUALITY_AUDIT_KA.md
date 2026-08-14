# Georgian question bank — audit and repair

8,303 Georgian questions were in production. 250 are retired, 179 rewritten,
53 flagged for a Georgian editor.

Run `node scripts/audit-questions.mjs --lang ka` to reproduce the counts.

---

## What was wrong

| | count | effect on the player |
|---|---|---|
| Duplicate questions | 229 | the same question comes round twice in a session, sometimes with a different answer each time |
| Question over 90 chars | 104 | no clamp on the card, so it pushes the answers into a scroll region |
| Stem broken or empty | 15 | one in-production question had **no text at all**; others read `?`, or `საქართველოს რომელი პრემიერ-მინისტრი?` with nothing after it |
| Answer contained in the question | 10 | pickable without reading the stem |
| Non-Georgian letters inside Georgian words | 6 | `კოფი ანანი` spelt with Hebrew vav, pe and yod; π written as Cyrillic п |
| Options that repeat each other | 2 | four options, all saying "no, it is impossible" |
| Grammar and spelling | 50 | `რომელიეა`, `რამეჟავებს`, two copulas in one clause, `ფარნაოსი` for `ფარნავაზი` |
| Wrong correct answer | 11 | the first king of Abkhazia was Leon **II**; ორშიმო is a pick, not a vessel |

The clearest example: `d5f5dc17` is served to players with an empty question
and four Bollywood actors as options. It was graded **A** by the existing AI
review, which checks neither length, nor script, nor whether the question
exists.

Targets come from what the game renders, not from the config constants —
`quiz-question-card.tsx:50-56` stops shrinking at 18px and never clamps;
`quiz-answer-button.tsx:140-154` is `line-clamp-2`. **No Georgian answer is
long enough to be clipped** — the longest is 43 characters against a TV-mode
limit of 48 — so unlike the English bank, no answer text is being lost.

## What the duplicates looked like

The bank was assembled category by category, and the same fact was written
separately into each one. `ვინ დახატა „ვარსკვლავებიანი ღამე“?` exists five
times across ცნობილი ადამიანები and ხელოვნება, twice with the title spelt
`ვარსკვლავიანი`. `რა არის ადამიანის სხეულის ყველაზე დიდი ორგანო?` exists
seven times, in five categories.

54 of the clusters disagreed with themselves. Most were the same answer worded
differently — `ევერესტი` against `მთა ევერესტი`, `გოთიკა` against `გოთური` —
but some were real:

- `რომელი ინგრედიენტია აუცილებელი საცივის მოსამზადებლად?` answered **ნიგოზი**
  in one copy and **ხახვი** in the other. Satsivi is a walnut sauce.
- `რა არის ყველაზე სწრაფი ცხოველი დედამიწაზე?` answered **შევარდენი** in one
  and **გეპარდი** in another, with no falcon among the second one's options.
- `რა ჰქვია დედამიწის გარე ფენას?` answered **ლითოსფერო** and **ქერქი**.
- `ვინ იყო გერმანული იდეალიზმის ფუძემდებელი?` answered **ჰეგელი** in one copy
  and **კანტი** in the other, each offering the other's answer as a distractor.

Each of those was decided by hand and recorded in
`scripts/question-repair-ka/dup_decisions.json` with the reason. 16 pairs that
read as duplicates and are not — the 16th and the 32nd US president, the
largest organ and the largest *internal* organ, how many planets and which is
the largest — are recorded there too, so a later run cannot collapse them.

## Coverage — read this before trusting the factual column

Three of the four things asked for are covered across all 8,303 questions,
because they can be checked by rule:

- **length** — every stem and option measured
- **duplicates** — every pair scored, whole bank
- **grammar and structure** — whitespace, punctuation, mixed scripts, repeated
  options, self-answering stems, stems that are not questions, machine-clipped
  answers, all swept bank-wide

**Factual accuracy was read by hand for four categories** — საქართველოს
ისტორია, ქართული ლიტერატურა, ქართული კულტურა, ქართული სამზარეულო, 885
questions — plus every one of the 54 self-disagreeing duplicate clusters,
which are spread across all 45 categories. That is roughly 12% of the bank
read closely, chosen as the Georgia-specific categories where an error is both
likeliest and least forgivable.

**The other 41 categories have not been fact-checked.** Their length,
duplicate, grammar and structure defects are repaired; a wrong answer sitting
quietly in ფიზიკა or ანიმე და მანგა would not have been found by this pass.
The four categories that were read turned up 11 wrong answers and 35 claims
that could not be verified, in 885 questions. Extrapolating that rate, the
unread 7,400 hold on the order of 90 wrong answers and 290 doubtful ones.

## Flagged, not fixed

53 questions are marked `quality_status = 'needs_review'` and **left in
production**. These are claims this pass could not verify, not claims it found
wrong — retiring a question on a hunch is its own kind of error. Examples:

- `ვინ არის ქართული პროზის დედოფალი?` — not an established epithet
- `რომელი ქართული ცეკვის თემაა ნადირობა?` → `ნადირობანა`, not a documented dance
- `რა არის ტრადიციული ქართული ცივი სუპი?` → `ოქროში`, which appears to be okroshka
- `რომელ საუკუნეს მიეკუთვნება ასომთავრულის შექმნა?` says IV, while three other
  questions in the bank say V

They are queryable:

```sql
SELECT id, question_text, correct_answer, quality_issues
FROM questions WHERE language = 'ka' AND quality_status = 'needs_review';
```

## Not included

**262 questions remain over the 70-character standard** and **270 have an
answer over 20**. None of them is broken — they render, and no Georgian answer
is long enough to be clipped. Shortening them is editorial work with no defect
behind it.

**565 questions mix quote styles** — `'X'`, `"X"` and `„X“` all appear where
the bank's convention is `„X“`. A bulk substitution would have to tell a quote
from an apostrophe inside a Latin title (`Howl's Moving Castle`), and the
payoff is cosmetic, so it was left alone.

**Georgian numerals are inconsistent**: `XIII საუკუნეში` and `მე-13 საუკუნეში`
both appear, sometimes as each other's distractors.

## What lets this refill

The generator and review path do not enforce what the card renders:

- `run-generation-job` warns at 35-character answers instead of rejecting them.
- `GameStyleQuestionPreview` tells reviewers 110 characters is acceptable,
  against a validator enforcing 70.
- The AI review scores grammar, uniqueness and clarity, and graded **A** to a
  question with no text, to `კოფი ანანი` spelt in Hebrew, and to both halves of
  every contradicting pair. Uniqueness is scored per question against the
  category it is being written into, which is why the same fact could be
  written seven times across five categories without ever scoring as a
  duplicate.

`scripts/audit-questions.mjs` exits non-zero while player-visible defects
remain, so it can be wired into CI once the migration is applied.
