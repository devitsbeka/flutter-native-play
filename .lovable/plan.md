
# Fix: Star Display Mismatch and Level-Up Reward Calculation

## Bug 1: 0-Star Result Upgrading to 1-Star After Save

### Root Cause

There are **two different star formulas** in the codebase that disagree:

**Local formula** (line 680 in `CategoryQuizPage.tsx`) -- used during saving:
```
const stars = Math.min(3, Math.floor((score / questions.length) * 4));
```

**Server formula** (line 242-248 in `useCategoryProgress.ts`) -- used after save completes:
```
if (percentage >= 80) stars = 3;
else if (percentage >= 60) stars = 2;
else if (percentage >= 40) stars = 1;
else if (percentage >= 20) stars = 1;   // <-- This is the problem
```

Example with score=1 out of 5 questions (20%):
- Local formula: `Math.floor((1/5) * 4) = Math.floor(0.8) = 0` -- shows 0 stars
- Server formula: `20% >= 20` -- returns 1 star

So during saving, the screen shows "practice more" with 0 stars. After save completes (2-3 seconds), `savedStars=1` kicks in and it flips to "excellent!" with 1 star.

### Fix

Replace the local formula on line 680 with the **same percentage-based thresholds** used in `updateLevelProgress`. This ensures both calculations always agree.

```text
Before: Math.min(3, Math.floor((score / questions.length) * 4))
After:  Same percentage logic as updateLevelProgress
```

Additionally, per the user's explicit requirement: **0 stars must never be auto-upgraded to 1 star.** The `updateLevelProgress` threshold of `>= 20%` giving 1 star is too generous -- getting 1 out of 5 correct (20%) should result in 0 stars, not 1. This preserves level-gate integrity (you must earn at least 1 star to unlock next level).

Updated star thresholds (both places):

| Score % | Stars |
|---------|-------|
| 80-100% | 3 stars |
| 60-79%  | 2 stars |
| 40-59%  | 1 star |
| 0-39%   | 0 stars |

This removes the `>= 20%` rule that was too lenient.

---

## Bug 2: Level-Up Reward Shows 6600 Coins (Should Be 150)

### Root Cause

The **display calculation** (line 835) uses the **DEPRECATED** formula:
```
const levelUpCoins = didLevelUp ? REWARDS.LEVEL_UP_COINS_PER_LEVEL * newProfileLevel : 0;
// At level 66: 100 * 66 = 6600 coins displayed!
```

But the **actual reward credited** (line 402) uses the correct simplified formula:
```
const levelUpCoins = REWARDS.LEVEL_UP_COINS;  // Fixed 150 coins
```

So users see "+6600 coins" on screen but only receive 150 coins.

### Fix

Update the display calculation to use `REWARDS.LEVEL_UP_COINS` (fixed 150) and remove the deprecated gems display entirely (gems are no longer awarded on level-up).

```text
Before: REWARDS.LEVEL_UP_COINS_PER_LEVEL * newProfileLevel  (= 6600 at level 66)
After:  REWARDS.LEVEL_UP_COINS                               (= 150 fixed)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CategoryQuizPage.tsx` (line 680) | Fix local star calculation formula to match server logic |
| `src/pages/CategoryQuizPage.tsx` (lines 835-838) | Fix level-up coin display to use `REWARDS.LEVEL_UP_COINS` (150), remove deprecated gem display |
| `src/hooks/useCategoryProgress.ts` (lines 247-248) | Remove the `>= 20%` gives 1 star rule -- require at least 40% for 1 star |

---

## Technical Details

### CategoryQuizPage.tsx -- Local Star Formula (line 680)

Replace:
```tsx
const stars = Math.min(3, Math.floor((score / Math.max(questions.length, 1)) * 4));
```

With:
```tsx
const starPercentage = (score / Math.max(questions.length, 1)) * 100;
const stars = starPercentage >= 80 ? 3 : starPercentage >= 60 ? 2 : starPercentage >= 40 ? 1 : 0;
```

### CategoryQuizPage.tsx -- Level-Up Display (lines 835-838)

Replace:
```tsx
const levelUpCoins = didLevelUp ? REWARDS.LEVEL_UP_COINS_PER_LEVEL * newProfileLevel : 0;
const levelUpGems = didLevelUp && newProfileLevel % REWARDS.LEVEL_UP_GEMS_THRESHOLD === 0 
  ? Math.floor(newProfileLevel / REWARDS.LEVEL_UP_GEMS_THRESHOLD)
  : 0;
```

With:
```tsx
const levelUpCoins = didLevelUp ? REWARDS.LEVEL_UP_COINS : 0;
```

Also remove the gems display section from the level-up banner (around line 934-937) since gems are no longer awarded on level-up.

### useCategoryProgress.ts -- Star Thresholds (lines 242-248)

Replace:
```tsx
let stars = 0;
if (percentage >= 100) stars = 3;
else if (percentage >= 80) stars = 3;
else if (percentage >= 60) stars = 2;
else if (percentage >= 40) stars = 1;
else if (percentage >= 20) stars = 1;
```

With:
```tsx
let stars = 0;
if (percentage >= 80) stars = 3;
else if (percentage >= 60) stars = 2;
else if (percentage >= 40) stars = 1;
```

---

## Summary

1. **Star formula alignment**: Both local and server use the same percentage-based thresholds, eliminating the "0 to 1 star flip" bug
2. **Stricter star gating**: Require 40%+ correct to earn 1 star (was 20%), ensuring 0-star results stay as 0 stars
3. **Level-up coins display fix**: Shows the actual 150 coins awarded instead of the deprecated 6600 formula
4. **Removed deprecated gems display**: Level-up no longer shows gem rewards since they are not awarded
