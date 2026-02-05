

# Plan: Fix Observer Scoring Issues in Multiplayer Trivia

## Problem Analysis

Based on the code investigation, I found **two critical bugs** that explain why the host (observer) lost despite the player answering incorrectly on the last question:

### Bug 1: Race Condition - Last Question Bonus Not Awarded

**Root Cause:**
When the observer mode is active, bonuses are collected via a polling mechanism every 2 seconds. However, when the last question ends:

1. Player submits incorrect answer → `player_answers` record is inserted
2. Observer auto-advances when all players move to next question
3. `nextQuestion()` transitions to "results" phase after only **200ms wait**
4. The 2-second polling interval **never catches the last incorrect answer**

**Location:** `MultiplayerObserverScreen.tsx` (lines 107-112 and 124-128)

```text
Timeline:
0ms    - Player answers wrong
0ms    - player_answers record inserted
10ms   - current_question updated to 6
50ms   - participants realtime triggers "allPlayersAdvanced" 
50ms   - nextQuestion() called for observer
250ms  - Results screen shown (200ms wait + overhead)
2000ms - Observer bonus poll would have run (NEVER HAPPENS - component unmounted!)
```

### Bug 2: Scoring Formula Mismatch

**Root Cause:**
There are two different scoring formulas being used:

| Who | Formula | Max Points |
|-----|---------|------------|
| **Player** (correct) | `100 + timeRemaining × 10` | 250 (instant) |
| **Observer** (wrong answer) | `100 + (15 - timeRemaining) × 5` | 175 (timeout) |

This means even if both bugs were fixed, the observer uses a **different multiplier (5 vs 10)**, making their max score lower than players.

**Location:**
- Player: `MultiplayerContextV2.tsx` line 1342
- Observer: `tvScoring.ts` lines 36-42 (`calculateObserverBonus`)

## Solution

### Fix 1: Immediate Bonus Award Before Auto-Advance

Instead of relying on polling, fetch and process incorrect answers **immediately before calling nextQuestion()**:

```text
Flow:
1. All players advanced → trigger effect
2. BEFORE advancing: poll for any unprocessed incorrect answers
3. Award any remaining observer bonus
4. THEN call nextQuestion()
```

### Fix 2: Unify Scoring Formulas

Change observer bonus to use the same multiplier as player scoring:

| Current | Proposed |
|---------|----------|
| `100 + (15 - timeRemaining) × 5` | `100 + (15 - timeRemaining) × 10` |

This ensures "fair" equivalence - if a player answers wrong quickly (14s left), the observer gets `100 + 1×10 = 110`. If timeout (0s), observer gets `100 + 15×10 = 250`.

## Technical Changes

### File 1: `src/components/team/MultiplayerObserverScreen.tsx`

**Change the auto-advance effect to process bonuses before advancing:**

Lines 114-129 - Modify auto-advance effect:

```tsx
// Auto-advance observer when ALL players have moved to next question
useEffect(() => {
  const otherPlayers = participants.filter(p => p.user_id !== user?.id);
  if (otherPlayers.length === 0) return;
  
  // Check if all players have advanced past current question
  const allPlayersAdvanced = otherPlayers.every(
    p => (p.current_question || 0) > currentQuestionIndex
  );
  
  if (allPlayersAdvanced) {
    console.log(`[Observer] All players advanced, processing final bonus before advancing`);
    
    // CRITICAL FIX: Fetch and process any unprocessed incorrect answers BEFORE advancing
    const processFinalBonus = async () => {
      const roomId = currentRoom?.id;
      if (!roomId) {
        nextQuestion();
        return;
      }
      
      const { data: allAnswers } = await supabase
        .from("player_answers")
        .select("user_id, question_index, time_remaining, is_correct")
        .eq("room_id", roomId)
        .eq("is_correct", false);
      
      if (allAnswers && allAnswers.length > 0) {
        let newBonus = 0;
        
        for (const answer of allAnswers) {
          const answerId = `${answer.user_id}-${answer.question_index}`;
          if (processedAnswerIdsRef.current.has(answerId)) continue;
          
          const timeRemaining = answer.time_remaining ?? 0;
          const bonus = calculateObserverBonus(timeRemaining);
          newBonus += bonus;
          processedAnswerIdsRef.current.add(answerId);
        }
        
        if (newBonus > 0) {
          setBonusEarnedThisRound(prev => prev + newBonus);
          await awardObserverBonus(newBonus); // AWAIT to ensure score is saved
        }
      }
      
      playSound("button-click");
      nextQuestion();
    };
    
    processFinalBonus();
  }
}, [participants, currentQuestionIndex, user?.id, nextQuestion, playSound, currentRoom?.id, awardObserverBonus]);
```

### File 2: `src/utils/tvScoring.ts`

**Align observer bonus multiplier with player scoring:**

Lines 36-42 - Update `calculateObserverBonus`:

```tsx
export const calculateObserverBonus = (timeWhenAnswered: number): number => {
  // Unified scoring: same multiplier as player scoring (10x)
  // If player answered wrong quickly (14s left), observer gets less (110)
  // If player timed out (0s left), observer gets max (250)
  const clampedTime = Math.max(0, Math.min(timeWhenAnswered, QUESTION_TIME_SECONDS));
  const timeUsed = QUESTION_TIME_SECONDS - clampedTime;
  // Use same 10x multiplier as player scoring for fairness
  return Math.round(BASE_POINTS + (timeUsed * 10));
};
```

**Note:** This requires updating the constant at the top of the file:

```tsx
const TIME_BONUS_MULTIPLIER = 10; // Changed from 5 to match player scoring
```

Or alternatively, define a new constant for multiplayer:

```tsx
const OBSERVER_BONUS_MULTIPLIER = 10; // Match player scoring
```

### File 3: `src/contexts/MultiplayerContextV2.tsx`

**Increase wait time before transitioning to results:**

Line 1384 - Increase propagation wait:

```tsx
// Wait for score to propagate (increased from 200ms to allow observer bonus to sync)
await new Promise(resolve => setTimeout(resolve, 500));
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/team/MultiplayerObserverScreen.tsx` | Add immediate bonus fetch before auto-advance |
| `src/utils/tvScoring.ts` | Update multiplier from 5 to 10 |
| `src/contexts/MultiplayerContextV2.tsx` | Increase results transition delay |

## Testing Scenarios

After implementation, test these scenarios:

1. **Last question incorrect**: Player answers wrong on last question → Host should get bonus
2. **Tied game**: Start tied, last player wrong → Host should win with bonus
3. **Quick wrong vs timeout**: Verify bonus scales correctly (quick wrong = less bonus)
4. **Score display**: Verify final scores match expected calculations

