

## Reduce Level-Up Frequency and Actually Gift Rewards

### Problem
The "დონემ აიწია" (Level Up) modal appears almost every game because the XP thresholds for early levels are very low (Level 2 = 100 XP, Level 3 = 348 XP), and each game awards hundreds of XP points. Users see it so often it loses its impact, and they don't believe the power-up rewards are real.

### Solution
Gate the level-up celebration on **cumulative correct answers** instead of raw XP thresholds. The level-up modal will only appear after every **20 correct answers** across all games, making it feel earned and special. The power-up reward will continue to be genuinely credited to the user's account (this already works, but users didn't trust it because it appeared too often).

### How It Works

1. **Track correct answers on profile**: Add a `total_correct_answers` column to the `profiles` table
2. **Increment after each game**: After a match, add the number of correct answers from that session to the running total
3. **Level-up trigger**: Instead of checking `newLevel > oldLevel`, check if the player crossed a 20-answer milestone (e.g., 20, 40, 60, 80...)
4. **Level calculation stays the same**: The XP-based level system still works for the level badge and progress bar -- only the celebration modal timing changes

### Changes

| File | Change |
|------|--------|
| Database | Add `total_correct_answers` integer column (default 0) to `profiles` table |
| `src/components/game/MatchResultScreen.tsx` | Replace level-crossing check with correct-answer milestone check (every 20). Update `total_correct_answers` alongside other stats. Use `missionTracker.getSessionData().correctAnswers` for the count. |
| `src/components/home/LevelUpModal.tsx` | Update displayed level to reflect milestone number (total_correct_answers / 20) instead of XP level, or keep showing the XP level -- whichever feels better |
| `src/config/rewardConfig.ts` | Add `LEVEL_UP_CORRECT_ANSWERS_THRESHOLD: 20` constant |

### Technical Details

**MatchResultScreen.tsx key change (lines 304-392):**
- After game ends, get `correctAnswers` from `missionTracker.getSessionData()`
- Calculate: `oldMilestone = Math.floor(oldCorrectAnswers / 20)` and `newMilestone = Math.floor(newCorrectAnswers / 20)`
- If `newMilestone > oldMilestone`: show level-up modal, credit 150 coins + 1 random power-up (same as now)
- Update profile with `total_correct_answers: newCorrectAnswers`
- The XP-based level still updates silently (total_points) for the level badge

**Database migration:**
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_correct_answers integer DEFAULT 0;
```

**rewardConfig.ts addition:**
```
LEVEL_UP_CORRECT_ANSWERS_THRESHOLD: 20
```

This means a user who gets ~5 correct answers per game will see the level-up modal roughly every 4 games instead of every game -- much more impactful and rewarding.
