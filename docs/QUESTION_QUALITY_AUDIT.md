# English question bank — pre-launch audit

Audited the full English bank: **7,839 rows, 7,344 of them `in_production`** — the
ones players can actually be served. Georgian (8,305 in production) was measured
alongside for contrast.

Re-run any time with:

```sh
set -a && . ./.env && set +a
node scripts/audit-questions.mjs --csv en-triage.csv
```

It exits non-zero while any player-visible defect remains, so it can gate a
release build the same way `verify-ios-bundle.mjs` does.

---

## Verdict

The bank is in better shape than the headline numbers suggest. The facts are
mostly right — reading a random sample of 150 production questions end to end
turned up two hard factual errors and a handful of weak-but-defensible ones.

What is not fine is **fit**. 3,565 of 7,344 questions carry at least one
finding, and **685 (9.3%) are broken for the player today** — text that is
cut off, options that repeat, or two questions in the bank that give
contradictory answers.

None of this blocks a launch on its own. All of it is fixable in days, not
weeks, and most of it by the tooling that already exists in this repo but has
never been pointed at the English bank.

| | in-production EN |
|---|---|
| Broken for the player | **685** (9.3%) |
| Off the project's own 70/20 standard, but renders | 2,683 more |
| Flagged for human review only | 197 |
| Clean | 3,779 (51.5%) |

(Buckets are disjoint — a question is counted at its worst severity. Many
questions carry several findings; the CSV has 6,334 rows across 3,565
questions.)

---

## 1. Length — the main problem, and it is not where the constants say it is

### What the game actually does

Worth being precise here, because questions and answers fail in opposite ways.

**Questions** (`src/components/ui/quiz-question-card.tsx:50-56`) shrink 20px →
19px at 50 chars → 18px at 60 chars, and then **stop**. There is no
`line-clamp`, no `max-height`. A 200-char question renders at the same 18px as a
61-char one; the card just grows. Because the answer list beneath it is
`flex-1 … overflow-y-auto` (`QuizGameScreenProd.tsx:483`), **a long question is
never truncated — it silently pushes the answers into a scroll region.** The
player sees a wall of text and two visible options.

On a 390pt iPhone the line box is 318px, so ~40 chars per line at 18px:

| Question length | in production | what the player sees |
|---|---|---|
| ≤ 70 chars | 6,149 (83.7%) | two clean lines, fits the 80px card |
| 71–90 | 667 (9.1%) | tight, still readable |
| 91–105 | 358 (4.9%) | three lines, answer area squeezed |
| **> 105** | **170 (2.3%)** | **four-plus lines, answers scroll off-screen** |

Longest in production is 118 chars, and there are several:

> "In the field of psychology, what is the general consensus regarding the reliability of 'recovered' repressed memories?"

**Answers** (`src/components/ui/quiz-answer-button.tsx:140-154`) behave the
opposite way — `line-clamp-2` is a **hard ellipsis**. The text is genuinely
lost. Font drops 16px → 14px past 30 chars and then stops. Two lines of ~286px
at 14px is roughly 75 chars on a phone. **TV mode puts the same button in a
2-column grid** (`TVQuestionScreenV4.tsx:485`), where the clamp bites at ~48.

| Longest option | in production | what the player sees |
|---|---|---|
| ≤ 20 chars | 5,209 (70.9%) | the standard |
| 21–30 | 1,239 (16.9%) | fine |
| 31–48 | 732 (10.0%) | fine on phone, at the edge on TV |
| **49–75** | **99 (1.3%)** | **ellipsized on TV** |
| **> 75** | **65 (0.9%)** | **ellipsized everywhere** |

The worst is 140 characters, in production, as a tappable button:

> "Indian curries exhibit significant regional variations in ingredients, spices, and preparation methods, leading to distinct flavor profiles."

That is a paragraph where a label belongs. On a phone the player sees about
half of it and then "…".

### Why it drifted

Three compounding causes, all fixable:

**a) Six competing limits.** Nothing in the codebase agrees on what "too long"
means:

| Limit (question/answer) | Where |
|---|---|
| **70 / 20** | `src/constants/questionQuality.ts:11,14` — canonical, enforced in `questionService.ts:183` |
| 65 / 20 | `src/hooks/useQuestionParser.ts:17` and three edge functions |
| 67 / 20 | `src/components/admin/CombinedShortener.tsx:87` |
| 65 / 25 | user-created trivia editors |
| 65 / 16 | `QuestionMockupPreview.tsx:18` |
| **110 / 25** | `GameStyleQuestionPreview.tsx:21` — the import review screen |
| 70 / **35** | `run-generation-job/index.ts:7` — warns, does not reject |

The generator that produced most of this bank warns at 35-char answers and
lets them through. The screen reviewers approve them on says 110 chars is
acceptable. So content was authored to a 110/35 budget and is being rendered
against an 18px floor and a two-line clamp.

**b) The shortening pipeline was only half run.** Of 7,344 in-production
English questions, **3,878 have never been through `shorten-questions`** and
**3,992 have never been through `shorten-answers`**. Both functions exist and
work.

**c) The quality scanner has effectively never run.** `last_quality_check` is
null on **7,278 of 7,344** — 99.1%. `scan-question-quality` already checks
length, missing question marks, and answer-in-question. It has just never been
pointed at this bank.

Georgian, for contrast, is only 3.3% over the answer standard versus **29.1%**
for English. This is an English-generation problem, not a platform one.

### One caveat on the shortener

Where it *has* run, it sometimes produces labels that read as machine output —
42 in production:

- "Pritzker Prize Fdn" / "Intl. Design Comm." / "World Bldg Awards"
- "Amsterdam Stk Exch"
- "Noise-induced H.L."
- "Measure alt w/ sextant"
- "Stuck PORV + gages" (also a typo — "gauges")

Worth a pass with an instruction not to invent abbreviations, and to drop a
qualifier instead.

---

## 2. Illogical questions and answers

### Contradicting duplicates — 55 pairs, the most serious finding

The same question exists twice with **different correct answers**. Whichever the
player is served, one of them marks a correct player wrong.

The clearest is in production, both graded **A** by the AI reviewer:

| | question | correct | distractors |
|---|---|---|---|
| `601ef0a7` | What is area of circle formula? | `πr^2` | 2πr, πd, πh |
| `676e1e4c` | What is area formula of a circle? | **`2πr`** | **πr²**, a²+b²=c², a·b |

`676e1e4c` is exactly inverted — 2πr is the circumference. A player who knows
geometry picks πr² and is marked wrong.

Others confirmed:

- **Instagram's original name** — `b05fc333` says "Burbn" (correct);
  `dbeb87ed` says **"Codename"** (wrong).
- **Ultraviolet vision** — `bfbe6021` says "Some people can after lens removal"
  (correct — aphakia); `f3a221d6` says "No, biologically impossible", and its
  stem, "Can humans actually see ultraviolet light **with eye exercises**?",
  is not a real question.
- **Speed of light** — five variants across `299,792,458 m/s`, `299,792 km/s`
  and `c`.
- **Ohm's law** — four questions split between `V = IR` and `U=IR`. Both
  notations are valid, but `U=IR` appears as the correct answer in one question
  and `V = IR` is a *distractor* nowhere — the risk is a player learning one
  form and meeting the other.
- **Water's formula** — five near-identical questions, some `H₂O`, some `H2O`.

### Repetition

77 further near-identical pairs share the same answer. Some clusters are large
enough that a player will notice: **nine** variants of the "do humans use only
10% of their brain" myth, four of "did Vikings wear horned helmets", five of
water's formula.

### Broken option sets — 49

- **10 questions have fewer than 4 options** — e.g. "Example of an optical
  disk?" ships with two ("CD-ROM", "Flash drive"), a coin flip.
- **34 have duplicate options.** Some are real ("Which animal had a grumpy
  meme?" lists "Grumpy Cat" twice — as the correct answer *and* a distractor).
  Others only collide after punctuation is stripped, which is harmless.
- **5 English questions carry Georgian answer text** — e.g. "What anime world
  has Nen?" → "Hunter x Hunter" against "დრაკონის ბურთი", "იუიუ ჰაკუშო". The
  right answer is the only one the player can read.

### Giveaways — 349

- **277 questions where the correct answer is more than 10 characters longer
  than every distractor.** A player who reads nothing can pick the long one.
  This correlates almost exactly with the over-length answers, so shortening
  fixes both at once.
- **72 where the correct answer appears in the question**, e.g. "Which Netflix
  series featured squid game competition?" → Squid Game; "Which Oscar-winning
  actor founded the Leonardo DiCaprio Foundation?" → Leonardo DiCaprio; "How
  many leading US companies does the S&P 500 index track?" → 500. Note this
  check has real false positives — "Which released first: The Dark Knight or
  Iron Man?" names both by design.
- **95 type mismatches**, where the correct answer is shaped differently from
  every distractor: "What is the highest score possible on an IQ test?" →
  "No fixed upper limit" against 200, 180, 160.

### Ambiguous by construction — ~64

- **23 "which came first" questions carry a "Same year" or "Cannot determine"
  filler option**, and at least one is genuinely ambiguous: "Which released
  first: The Dark Knight or Iron Man?" — the marked answer is Iron Man, but
  both are 2008, so **"Same year" is also true**.
- **41 subjective stems** with no single defensible answer: "Most common
  difficulty levels from easiest to hardest?", "Which feline trait best explains
  conflict in *Tiger King*?" (the conflict in *Tiger King* is between people),
  "TikTok's algorithm mimics which animal's herd behavior?" (invented premise).
- Some are ambiguous on facts rather than wording: "Which museum banned selfie
  sticks due to the 2010s craze?" → MoMA, but the Met, the Guggenheim and Tate
  Modern all did too.

### Staleness — 41 flagged, roughly half genuine

Confirmed stale: "How many Grammy Awards has Beyoncé won in total?" → **32**.
She is on 35 since February 2025.

Others are year-stamped and will read as dated ("as of 2020", "As of 2014"), or
volatile ("Which celebrity beauty brand has the highest valuation?" → Fenty,
which Rhode's $1B sale in 2025 makes arguable). The regex over-fires on
harmless uses — "which numeral system is used today" is not going to change —
so treat this bucket as a reading list, not a fix list.

---

## 3. Two things the audit does not cover

**Icon relevance.** Every production question but one has an `icon_slug`, but
the assignment is loose. Spot-checked from the Question Studio screenshot:
"How many rules are in the Code of Hammurabi?" carries `celtic-ogham-stone`,
and "How long did the shortest war in history last?" carries
`world-war-ii-sherman-tank` (the war was Anglo-Zanzibar, 1896). 2,240 distinct
icons across 7,344 questions, so most are one-offs and can't be checked by
rule. Needs either an eyeball pass on the most-played categories or a re-run of
`smart-assign-icons`.

**Systematic fact-checking.** I read 150 production questions closely and
checked every contradicting duplicate. That gives a rough error rate — about
2 hard factual errors per 150, so plausibly **60–150 across the bank** — but it
is an estimate from a sample, not a census. The `review-question-quality`
function exists and could be run across all 7,344 to produce a real number.

Also worth knowing: `ai_review_grade` is already **A on 6,058** English
questions, including `676e1e4c` with its inverted circle formula. The existing
AI review is not catching factual inversions, and it does not check length at
all. Don't treat an A as clearance.

---

## 4. What to do before launch

**Must fix — 685 questions, player-visible**

1. Resolve the **55 contradicting duplicates**. Keep one, delete the other.
   Fastest path: sort the triage CSV by `contradicting-duplicate` and work the
   list; each is a one-line decision.
2. Fix the **10 questions with fewer than 4 options** and the **34 with
   duplicate options**.
3. Fix the **5 English questions with Georgian answers** — `fix-mixed-language-questions`
   already exists for this.
4. Shorten the **164 answers over 48 chars** and the **528 questions over 90
   chars**. `shorten-answers` and `shorten-questions` handle this; add an
   instruction not to invent abbreviations.

**Should fix — cheap, high visible payoff**

5. **Unify the length constants on 70/20.** Everything else should import from
   `src/constants/questionQuality.ts`. In particular raise `run-generation-job`
   from a warning to a rejection, and drop `GameStyleQuestionPreview`'s 110/25
   — that screen is currently telling reviewers that unshippable content is
   fine.
6. Run `shorten-questions` and `shorten-answers` over the **~3,900 rows that
   have never been through either**, to clear the 2,683 off-standard rows.
7. Run `scan-question-quality` across the bank once, so `last_quality_check`
   stops being null on 99% of it.
8. Deduplicate the large repetition clusters (brain-10%, Vikings, water
   formula) down to one each.

**Nice to have — after launch is fine**

9. The 41 subjective stems and the 23 "which came first" fillers.
10. The 42 machine-shortened answer labels.
11. Icon relevance pass on the most-played categories.

**Worth doing regardless**

12. Make the admin preview honest. `QuestionPreviewPanel` already uses the real
    `QuizQuestionCard`, but renders it in a 320px frame against a real phone's
    390pt, so it shows about one extra wrapped line and makes fine questions
    look too long. None of the four preview components reproduce the answer
    `line-clamp-2`, which is the rule that actually loses text. Reviewers
    currently cannot see the defect they are being asked to catch.
13. Wire `scripts/audit-questions.mjs` into CI or the release script. It exits
    non-zero while player-visible defects remain.

---

## Appendix — running the audit

```sh
node scripts/audit-questions.mjs                     # EN, in-production
node scripts/audit-questions.mjs --lang ka           # Georgian
node scripts/audit-questions.mjs --all               # include drafts
node scripts/audit-questions.mjs --csv triage.csv    # full triage list
```

The CSV has one row per finding with `id`, `severity`, `check`, `detail`,
`category`, `ai_grade`, the question and its correct answer — paste an `id`
into Question Studio to jump straight to it.

Severities: `broken` (player sees it go wrong), `standard` (violates 70/20 but
renders), `review` (needs a human).

Georgian numbers are reported for contrast but the checks are tuned for
English — its `foreign-script` and `contradicting-duplicate` counts include
false positives (legitimate Latin brand names; paraphrases the token overlap
can't separate).
