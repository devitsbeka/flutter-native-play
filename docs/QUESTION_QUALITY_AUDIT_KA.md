# Georgian question bank — audit and repair

8,303 Georgian questions were in production, in two passes.

**Batch 1** (`20260815120000_question_repair_ka.sql`, applied): 250 retired,
179 rewritten, 53 flagged — the defects a rule can find across the whole bank,
plus a hand fact-check of the four Georgia-specific categories.

**Batch 2** (`20260816120000_question_repair_ka_batch2.sql`): 296 retired,
765 rewritten, 207 flagged — the hand read of the other forty-one categories,
which batch 1 explicitly did not cover.

**Batch 3** (`20260817120000_question_repair_ka_batch3.sql`): 42 retired across
31 groups. Batches 1 and 2 both rewrote question text — batch 1 shortened
stems, batch 2 fixed grammar and standardised names — and the duplicate
clustering ran *before* either rewrite existed, so it clustered text that is no
longer in the bank. Re-clustering the live text turns up 31 groups that now ask
the same question and take the same answer. Each group keeps one row.

Together: **588 retired, 944 rewritten, 260 flagged**, leaving 7,715 questions
in production.

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

## Coverage

Every one of the 45 categories has now been read.

Three of the four things asked for were covered across all 8,303 questions in
batch 1, because they can be checked by rule:

- **length** — every stem and option measured
- **duplicates** — every pair scored, whole bank
- **grammar and structure** — whitespace, punctuation, mixed scripts, repeated
  options, self-answering stems, stems that are not questions, machine-clipped
  answers, all swept bank-wide

**Factual accuracy** was read by hand for four categories in batch 1 —
საქართველოს ისტორია, ქართული ლიტერატურა, ქართული კულტურა, ქართული სამზარეულო,
885 questions — and for the remaining forty-one in batch 2. Batch 2 turned up
**1,265 findings in 7,418 questions**, roughly one defect for every six.

| kind | count | what it is |
|---|---|---|
| grammar and spelling | 365 | wrong case, typos, and one term spelt four ways across four questions |
| doubtful | 224 | a claim, a name or a term that could not be verified |
| broken stem | 187 | circular, self-answering, or not a sentence |
| ambiguous | 138 | a distractor as correct as the answer |
| clipped answer | 121 | an option cut mid-word by an earlier length pass |
| wrong answer | 103 | the marked answer is false |
| mixed script | 43 | Latin letters inside Georgian words |
| contradiction | 25 | two questions in the bank teaching opposite facts |
| miscategorised | 20 | a film question under television, a village under medicine |
| other | 39 | duplicate options, answer-in-question, truncated stems |

The batch-1 extrapolation was low. It predicted about 90 wrong answers in the
unread 7,400; the read found 103, plus 224 unverifiable claims against a
predicted 290 — but it did not predict the 121 clipped options, which are
damage the *earlier* automated shortening pass did to this bank before this
audit began.

### What the read kept finding

**Clipped options.** `„დამუხტ. ნაწილ. ზონა“`, `„გლ. პოზიც. სისტემა“`,
`„პასუხ. განცალკევება“` — an option truncated mid-word, sometimes all four in
one question. 121 of them.

**One thing under many names.** Reinforcement learning appears as
`გაძლიერებითი`, `გაძლიერებული` and `განმტკიცებითი სწავლა`; Breaking Bad as
`მძიმე დანაშაული`, `ბრეიქინ ბედი`, `ცუდი არ არის` and `არასწორი არ არის` —
the last two as *distractors in a question whose answer is the first*. Stranger
Things has four Georgian titles, the Vedas three, Huitzilopochtli four
spellings across four questions.

**Word-by-word translation of a proper name.** `Solid Snake` became
`გველის მყარი`, `Professor Oak` became `მუხა` (the tree), the vagus nerve
became `საშოს ნერვი`, `Manos de Piedra` became a boxer called `კასტელო`,
Shor's algorithm became `შორის` (the preposition "between").

**Trick stems with no subject.** `რა ჰქვია კუნძულს, სადაც ავსტრალიის
დედაქალაქი მდებარეობს?` → *there is no such island*. `რომელ კუნძულზე
მდებარეობს ეთიოპია?` → *none*. `რომელი თანამგზავრია ვენერას ყველაზე ახლოს?`
→ *it has none*.

**Contradictions across categories.** Vitamin C and vitamin E each marked *the*
antioxidant; karma assigned to Buddhism in one question and Hinduism in two;
the "sport of kings" answered chess five times and equestrianism once; the
"language of the gods" Sanskrit in one question and Egyptian in another, each
offering the other's answer as a wrong option.

## Flagged, not fixed

260 questions are marked `quality_status = 'needs_review'` and **left in
production** — 53 from batch 1 and 207 from batch 2. These are claims this pass could not verify, not claims it found
wrong — retiring a question on a hunch is its own kind of error. Examples:

- `ვინ არის ქართული პროზის დედოფალი?` — not an established epithet
- `რომელი ქართული ცეკვის თემაა ნადირობა?` → `ნადირობანა`, not a documented dance
- `რა არის ტრადიციული ქართული ცივი სუპი?` → `ოქროში`, which appears to be okroshka
- `რომელ საუკუნეს მიეკუთვნება ასომთავრულის შექმნა?` says IV, while three other
  questions in the bank say V

Batch 2 flagged, in the same spirit:

- `რომელი ვიტამინი არის ანტიოქსიდანტი?` → C, while another question answers E
- `რომელი სპორტის სახეობაა ცნობილი როგორც 'მეფეთა სპორტი'?` → equestrianism,
  against five questions answering chess for the same epithet
- `რომელია საქართველოს ამჟამინდელი პრეზიდენტი?` — out of date since
  December 2024
- `რა ჰქვია Facebook-ის ვირტუალურ ვალუტას?` → Libra, a project wound up in 2022
- `რომელი მინერალი ჰქვია „მეოცნებე ქვა“?` — not an established epithet
- `რომელი ცხოველი გახდა ინტერნეტ მემების სიმბოლო?` → cat, with dog and frog
  offered as wrong answers

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
