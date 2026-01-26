
# Fix: Prevent Premature Auto-Advance After Poll by Correcting Timing Ref Logic

## Problem Summary

After a poll finishes and the host starts a new game:
1. Host answers a question first
2. Other players cannot submit their answers (game advances too quickly)
3. Game is ruined

This issue does NOT occur on the first game (before any polls).

## Root Cause Analysis

The bug is in the **session subscription handler** in `TVGameContext.tsx` (lines 1239-1244):

```typescript
const isNewQuestion = typeof newData.current_question_index === 'number' 
  && newData.current_question_index !== prevIndex;

if (isNewQuestion) {
  // ...
  questionStartedAtRef.current = Date.now();  // BUG: Sets immediately!
}
```

**What happens:**

1. After a poll, `startGame` is called which sets `current_question_index = 0` and status = `countdown`
2. If the previous `current_question_index` was NOT 0 (e.g., from previous game), `isNewQuestion` becomes `true`
3. The subscription handler immediately sets `questionStartedAtRef.current = Date.now()`
4. BUT the game is still in `countdown` phase, not `playing`!
5. When the host answers first during the actual question phase, the 2500ms safety window may have already passed (from when the countdown started)
6. `checkAndAdvanceIfAllAnswered` fires prematurely because `questionStartedAtRef` was set too early

**Why first game works:**
- On first game, `current_question_index` goes from 0 to 0 (no change) or from undefined to 0
- `isNewQuestion` is false, so `questionStartedAtRef` stays at 0
- Only `startPlaying` sets it correctly after status becomes `playing`

## Solution

Modify the session subscription handler to ONLY set `questionStartedAtRef.current = Date.now()` when:
1. It's a new question (index changed), AND
2. The status is `playing` (not `countdown`)

This ensures the timing ref is only enabled during actual gameplay, not during countdown.

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Location: Lines 1239-1244 (inside `setupSessionSubscription` callback)**

**Before:**
```typescript
const isNewQuestion = typeof newData.current_question_index === 'number' 
  && newData.current_question_index !== prevIndex;
  
if (isNewQuestion) {
  tvLog('New question (subscription)', { from: prevIndex, to: newData.current_question_index });
  setMyAnswer(null);
  hasAdvancedRef.current = false;  // Reset for new question
  questionStartedAtRef.current = Date.now();
  // ... rest of the handler
}
```

**After:**
```typescript
const isNewQuestion = typeof newData.current_question_index === 'number' 
  && newData.current_question_index !== prevIndex;
  
if (isNewQuestion) {
  tvLog('New question (subscription)', { from: prevIndex, to: newData.current_question_index });
  setMyAnswer(null);
  hasAdvancedRef.current = false;  // Reset for new question
  
  // CRITICAL FIX: Only set questionStartedAtRef when status is 'playing'
  // During 'countdown', keep it at 0 to disable auto-advance checks
  // startPlaying will set it correctly after the countdown->playing transition
  if (newData.status === 'playing') {
    questionStartedAtRef.current = Date.now();
  } else {
    // Reset to 0 during countdown to ensure auto-advance is disabled
    questionStartedAtRef.current = 0;
  }
  // ... rest of the handler
}
```

### Additional Safety: Handle status change to 'playing'

Add logic to detect when status transitions TO `playing` and set the ref then:

**Location: Around line 1300-1320 (inside setState callback in subscription)**

**Before:**
```typescript
const newPhase = mapDbStatusToPhase(newData.status);
if (prev.phase !== newPhase) {
  tvLogPhase(prev.phase, newPhase, 'realtime subscription');
}
```

**After:**
```typescript
const newPhase = mapDbStatusToPhase(newData.status);
if (prev.phase !== newPhase) {
  tvLogPhase(prev.phase, newPhase, 'realtime subscription');
  
  // CRITICAL: When transitioning to 'playing', enable auto-advance timing
  // This catches cases where the subscription handler didn't see the question change
  if (newData.status === 'playing' && questionStartedAtRef.current === 0) {
    questionStartedAtRef.current = Date.now();
    console.log('[Subscription] Enabled auto-advance timing on status->playing transition');
  }
  
  // When transitioning to 'countdown', disable auto-advance timing
  if (newData.status === 'countdown') {
    questionStartedAtRef.current = 0;
    console.log('[Subscription] Disabled auto-advance timing on countdown');
  }
}
```

## Expected Behavior After Fix

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| First game, host answers first | Works correctly | Works correctly |
| After poll, host answers first | Game advances prematurely, other players locked out | All players can answer, game waits for everyone |
| Question index changes during countdown | `questionStartedAtRef` set immediately | `questionStartedAtRef` stays at 0 |
| Status changes to 'playing' | Ref may already be set incorrectly | Ref set correctly at this moment |

## Flow After Fix

```
Poll Results → Lobby → Start Game
                         ↓
              startGame() called
                         ↓
              status = 'countdown'
              current_question_index = 0
                         ↓
              Subscription sees question change
              BUT status is 'countdown'
              → questionStartedAtRef = 0 (disabled)
                         ↓
              3 second countdown
                         ↓
              startPlaying() called
              status = 'playing'
                         ↓
              Subscription sees status = 'playing'
              → questionStartedAtRef = Date.now() (enabled)
                         ↓
              Host answers first
                         ↓
              checkAndAdvanceIfAllAnswered()
              timeSinceStart = ~100ms (well under 2500ms)
              → Skip check, wait for others
                         ↓
              Other players answer
              → All answered, advance to reveal
```

## Files Modified

1. `src/contexts/TVGameContext.tsx` - Session subscription handler timing logic
