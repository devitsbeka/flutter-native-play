

# Plan: Observer Auto-Sync with Player Question Progression

## Problem Summary

When the host is observing (skipping their own trivia):
1. The observer sees a "შემდეგი კითხვა" (Next Question) button - **this is incorrect behavior**
2. When regular players click "Next Question" and advance, the observer stays stuck on the old question
3. The observer should automatically follow the players' progression

## Root Cause

The `MultiplayerObserverScreen` component currently:
- Shows a "Next Question" button with manual control for the observer
- The observer's `currentQuestionIndex` is only advanced when THEY click the button
- No synchronization mechanism exists to follow other players' progression

## Solution

### Change 1: Remove "Next Question" Button from Observer Screen

The observer should NOT manually control question progression. Instead, they should passively follow the players.

**File**: `src/components/team/MultiplayerObserverScreen.tsx`

Remove the entire bottom button section (lines 308-330) and replace with a passive status indicator showing "მოთამაშეები პასუხობენ..." (Players are answering...) or similar.

### Change 2: Auto-Advance Observer When Players Progress

Add an effect that monitors `participants` state. When ALL non-observer players have `current_question > currentQuestionIndex`, the observer should automatically advance.

**File**: `src/components/team/MultiplayerObserverScreen.tsx`

Add new effect after the bonus polling effect:

```typescript
// Auto-advance observer when ALL players have moved to next question
useEffect(() => {
  // Only run for observer
  const otherPlayers = participants.filter(p => p.user_id !== user?.id);
  if (otherPlayers.length === 0) return;
  
  // Check if all players have advanced past current question
  const allPlayersAdvanced = otherPlayers.every(
    p => (p.current_question || 0) > currentQuestionIndex
  );
  
  if (allPlayersAdvanced) {
    // All players have moved on - auto-advance observer
    console.log(`[Observer] All players at question ${otherPlayers[0].current_question}, auto-advancing from ${currentQuestionIndex}`);
    nextQuestion();
  }
}, [participants, currentQuestionIndex, user?.id, nextQuestion]);
```

### Change 3: Update UI to Show Passive State

Replace the button with a passive waiting indicator:

```tsx
{/* Bottom Area - Status Indicator (no button for observer) */}
<div className="px-4 pb-6 pt-4 flex-shrink-0">
  <div className="pb-[env(safe-area-inset-bottom)]">
    <div className="bg-white/10 rounded-2xl py-4 px-6 text-center">
      <p className="text-white/70 text-sm">
        {players.length > 0 
          ? `მოთამაშეები პასუხობენ... (${players.filter(p => opponentAnswers[p.user_id]).length}/${players.length})`
          : "ველოდები მოთამაშეებს..."
        }
      </p>
    </div>
  </div>
</div>
```

## Technical Details

- The `participants` array is already being fetched via realtime subscription in `MultiplayerContextV2`
- Each participant's `current_question` is updated when they call `nextQuestion()` (line 1282)
- The observer can access `participants` from the context
- Need to import `opponentAnswers` from the context to show answer progress

## Files to Modify

| File | Change |
|------|--------|
| `src/components/team/MultiplayerObserverScreen.tsx` | Remove manual button, add auto-advance effect, show passive status |

## Expected Behavior After Fix

1. Observer enters observer mode (skipping their trivia)
2. Observer sees: current question text, their score, and "Players are answering..." status
3. Players answer and click "Next Question" → their `current_question` updates in DB
4. Realtime subscription triggers `fetchParticipants` → participants state updates
5. Observer's new effect detects ALL players have advanced
6. Observer auto-advances to next question
7. Repeat until game ends

## Edge Cases Handled

- **Single player room**: If no other players, observer waits forever (correct - needs players)
- **Player disconnect**: Uses `current_question` from DB, not ephemeral state
- **Timer expires for player**: Player's answer is auto-submitted, `current_question` still updates
- **Last question**: Auto-advance to results screen works via existing `nextQuestion()` logic

