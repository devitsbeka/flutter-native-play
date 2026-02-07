

## Fix Observer (Host) Scoring: Majority-Based Instead of Per-Player

### The Problem

When the host creates a trivia and observes players, the current scoring in `MultiplayerObserverScreen.tsx` awards bonus points for **every single incorrect answer from every player**. With 4 players all answering wrong on one question, the host gets ~400-800 points, while each player can only earn 100-300 per correct answer. This is massively unfair.

### The Solution

Adopt the same majority-based logic that already exists in `TVGameContext.tsx` (TV mode):
- Group answers **per question** (not per player)
- For each question: count how many players answered correctly vs incorrectly
- If **more than 50% answered wrong** -- host earns a single question's worth of points (100-175 range, same as a correct player answer)
- If **50% or more answered correctly** -- host earns 0 for that question
- This caps the host's per-question earning to the same range as any player

### Example with 4 players

| Scenario | Correct | Wrong | Host gets |
|----------|---------|-------|-----------|
| All wrong | 0 | 4 | 100-175 pts (one bonus) |
| 3 wrong, 1 right | 1 | 3 | 100-175 pts (majority wrong) |
| 2 wrong, 2 right | 2 | 2 | 0 pts (not majority wrong) |
| 1 wrong, 3 right | 3 | 1 | 0 pts (majority correct) |
| All correct | 4 | 0 | 0 pts |

### Technical Changes

**File: `src/components/team/MultiplayerObserverScreen.tsx`**

Both the polling effect (lines 76-112) and the auto-advance effect (lines 128-159) use the same flawed per-player logic. Both will be rewritten to:

1. **Fetch ALL answers** (both correct and incorrect) for the room, not just incorrect ones
2. **Group answers by `question_index`**
3. **For each question** (that hasn't been processed yet):
   - Count total players who answered + total players in the game
   - Count how many answered incorrectly (wrong answers + players who didn't answer = "wrong")
   - Only if wrong count > 50% of total players: calculate ONE bonus using the average `time_remaining` of wrong answers
4. **Track processed questions** by `question_index` instead of individual `user_id-question_index` pairs (since we now process per-question, not per-answer)

**File: `src/utils/tvScoring.ts`** -- No changes needed. The existing `calculateObserverBonus` function already returns a single question's worth of points (100-175). The problem is purely in how `MultiplayerObserverScreen` calls it (once per wrong answer instead of once per question).

### Key Details

- The `processedAnswerIdsRef` will track processed **question indices** (e.g., `"q-0"`, `"q-1"`) instead of individual answer IDs
- The query changes from `.eq("is_correct", false)` to fetching all answers, so we can count both correct and incorrect per question
- Players who haven't answered a question at all count as "wrong" for majority calculation (consistent with TV mode logic)
- The bonus amount per question stays in the 100-175 range (same as `calculateObserverBonus` returns), ensuring parity with player scoring

