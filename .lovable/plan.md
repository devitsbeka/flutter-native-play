
# Fix: TV Mode Game Logic Issues (Timer 5s Bug, Auto-Advance, Button Click Issues)

## Executive Summary

Three critical issues are occurring in TV paired mode, specifically AFTER a first game finishes and a poll is used to select new categories:

1. **Timer shows 5 seconds instead of 15** - Game auto-advances to reveal after ~5 seconds
2. **Premature auto-advance** - Even with no answers, the game moves forward
3. **Start button unclickable** - After poll ends, the start button becomes frozen

## Root Cause Analysis

### Issue 1 & 2: The 5-Second Timer and Premature Auto-Advance

The problem stems from a **missing `timerInitializedForQuestionRef` lock** in the reveal-to-next-question transition.

**Current Flow (BUG):**
```text
Reveal Phase Timer Expires
         ↓
prepareForPlaying() → clears answers, verifies players
         ↓
DB Update → status='playing', question_start_time=now()
         ↓
setState({ timeRemaining: QUESTION_TIME }) → Local timer = 15s
         ↓
❌ timerInitializedForQuestionRef NOT SET HERE!
         ↓
Realtime Subscription Fires (with latency)
         ↓
Subscription sees timerInitializedForQuestionRef !== questionIndex
         ↓
Recalculates: timeRemaining = 15 - elapsed = ~5 seconds!
         ↓
Timer useEffect starts counting from 5s
```

The fix in `startPlaying()` correctly sets `timerInitializedForQuestionRef`, but the **reveal-to-next-question transition** (lines 1219-1243) does NOT set it. This is the path used after the first game and poll.

Additionally, the `hasAdvancedRef` is not being reset properly in this path, which can cause the auto-advance logic to fire incorrectly.

### Issue 3: Unclickable Start Button After Poll

After `finalizePollAndStartGame()` transitions to `countdown`, the context phase updates via realtime subscription. However, the `ControllerPollResults` component:

1. Sets `isStarting = true` on click
2. Awaits `finalizePollAndStartGame()`
3. If phase transitions before callback completes, React may not re-render properly
4. The `isStarting` state remains `true`, disabling the button

The button uses `disabled={isStarting || winningCategories.length === 0}`, so if `isStarting` never resets, the button stays frozen.

---

## Technical Solution

### Fix 1: Add Timer Initialization Lock in Reveal-to-Next-Question Transition

**File: `src/contexts/TVGameContext.tsx`**

**Location: Lines 1238-1243 (reveal useEffect)**

After setting `questionStartedAtRef`, add `timerInitializedForQuestionRef` and `hasAdvancedRef` resets:

```typescript
// Current code (lines 1237-1243):
questionStartedAtRef.current = Date.now();
console.log('[Next Question] ⏱️ Timing ref set AFTER DB transition:', questionStartedAtRef.current);

// CRITICAL: Reset timer for next question to ensure all clients start at QUESTION_TIME
setState(prev => ({ ...prev, timeRemaining: QUESTION_TIME }));

// ADD THESE THREE LINES:
// CRITICAL FIX: Mark timer as initialized for this question index
// This prevents the realtime subscription from overwriting our 15s timer
timerInitializedForQuestionRef.current = nextIndex;
hasAdvancedRef.current = false;
console.log('[Next Question] Timer marked as initialized for question', nextIndex);
```

### Fix 2: Add Same Lock in startNextRoundFromQueueIfAny

**File: `src/contexts/TVGameContext.tsx`**

**Location: Around lines 960-1000 (inside startNextRoundFromQueueIfAny, after DB update)**

After the transition to `round-intro` or `countdown`, add:

```typescript
// After the DB update in startNextRoundFromQueueIfAny:
// CRITICAL: Reset timer and advance refs for new round
timerInitializedForQuestionRef.current = null; // Will be set on countdown->playing
hasAdvancedRef.current = false;
questionStartedAtRef.current = 0;
console.log('[Next Round] Reset timing refs for new round');
```

### Fix 3: Ensure Robust Button State in ControllerPollResults

**File: `src/components/controller/ControllerPollResults.tsx`**

**Location: Lines 49-65 (handleStartGame function)**

Add a `finally` block to ensure `isStarting` always resets:

```typescript
const handleStartGame = async () => {
  if (winningCategories.length === 0) {
    toast.error('არ არის გამარჯვებული კატეგორიები');
    return;
  }

  setIsStarting(true);
  try {
    const success = await finalizePollAndStartGame(selectedRoundCount);
    
    if (success) {
      toast.success('თამაში იწყება!');
      onGameStart();
    } else {
      toast.error('თამაშის დაწყება ვერ მოხერხდა');
    }
  } catch (error) {
    console.error('[ControllerPollResults] Error starting game:', error);
    toast.error('თამაშის დაწყება ვერ მოხერხდა');
  } finally {
    // Always reset isStarting to ensure button isn't stuck disabled
    setIsStarting(false);
  }
};
```

---

## Summary of Changes

| File | Line Range | Change |
|------|------------|--------|
| `src/contexts/TVGameContext.tsx` | ~1240-1243 | Add `timerInitializedForQuestionRef.current = nextIndex` and `hasAdvancedRef.current = false` after reveal-to-next-question DB update |
| `src/contexts/TVGameContext.tsx` | ~970-1000 | Add timer ref resets in `startNextRoundFromQueueIfAny` after DB update |
| `src/components/controller/ControllerPollResults.tsx` | ~49-65 | Add try/catch/finally to ensure `isStarting` always resets |

---

## Why This Fixes All Issues

### Timer 5-Second Bug
The `timerInitializedForQuestionRef` lock prevents the realtime subscription from recalculating elapsed time. When the subscription handler sees `timerInitializedForQuestionRef.current === nextIndex`, it skips the timer recalculation and preserves the locally-set 15 seconds.

### Premature Auto-Advance
Resetting `hasAdvancedRef.current = false` at the right time ensures each question gets a fresh "can advance" state. Combined with the proper timer, auto-advance will only trigger after the full 15 seconds OR when all players answer.

### Frozen Button
The `finally` block ensures the button state is always reset, even if the async call throws an error or the component unmounts mid-call.

---

## Testing Checklist

1. Start a TV paired game and complete it
2. Start a poll, select categories, let voting finish
3. Click "Start Game" - button should work on first click
4. Verify countdown shows on TV and phones
5. When game starts, verify timer shows 15 seconds on ALL devices
6. Let timer run full 15 seconds with no answers
7. Verify game advances to reveal at exactly 15 seconds
8. Verify next question also gets full 15 seconds
9. Complete multi-round game and verify no timing issues
