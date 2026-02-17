

## Fix: 50/50 Power-Up Shows Only Correct Answer

### Problem

The 50/50 power-up always tries to hide 2 wrong answers. On true/false questions (which only have 1 wrong answer), it hides that single wrong answer, leaving only the correct answer visible -- effectively giving away the answer for free.

The same bug exists in two places:
- `src/pages/CategoryQuizPage.tsx` (solo/category quiz)
- `src/contexts/GameContext.tsx` (multiplayer/duel quiz)

### Solution

Two-part fix:

1. **Disable 50/50 on true/false questions** -- Since true/false only has 2 answers, removing 1 wrong answer would still reveal the correct one. The 50/50 power-up should be grayed out/disabled for these questions.

2. **Safety guard in the logic** -- Even for 4-answer questions, always keep at least 1 wrong answer visible. Change `slice(0, 2)` to `slice(0, Math.min(2, wrongAnswers.length - 1))` so there's always at least 1 wrong answer remaining.

### Technical Details

**File: `src/pages/CategoryQuizPage.tsx`**

- In `powerUpsForUI` (line ~728): add a condition to disable the 50/50 button when the current question is true/false
- In the 50/50 switch case (line ~686): change `slice(0, 2)` to `slice(0, Math.min(2, wrongAnswers.length - 1))` as a safety net

**File: `src/contexts/GameContext.tsx`**

- In the "fifty-fifty" switch case (line ~300): same safety fix -- change `slice(0, 2)` to `slice(0, Math.min(2, shuffled.length - 1))`

### Result

- True/false questions: 50/50 button appears disabled (grayed out) -- users cannot waste a power-up on it
- 4-answer questions: works as before (hides 2 wrong, leaves 1 wrong + 1 correct)
- 3-answer questions (if any): hides 1 wrong, leaves 1 wrong + 1 correct
- No scenario ever reveals only the correct answer
