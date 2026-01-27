

# Fix: Host Timer Starting at 5 Seconds Instead of 15

## Problem Identified

The timer shows only 5 seconds for the host instead of 15. The root cause is a race condition:

1. Host calls `startPlaying()` which sets `timeRemaining = 15`
2. Host updates DB with `status = 'playing'` and `question_start_time`
3. The realtime subscription then fires (often 5+ seconds later due to network latency)
4. The subscription handler checks `timerInitializedForQuestionRef.current !== currentQuestionIdx`
5. Since `startPlaying()` never sets this ref, the check passes
6. Timer gets recalculated as `15 - elapsed = ~5 seconds`
7. Timer useEffect starts counting from 5 instead of 15

## Solution

In the `startPlaying` function, after setting `timeRemaining = QUESTION_TIME`, also mark the timer as initialized for this question index. This will prevent the realtime subscription from overwriting the timer.

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Current Code (lines 2383-2388):**
```typescript
// CRITICAL: Reset local timeRemaining to ensure host timer starts fresh
// This must happen BEFORE the phase changes to 'question' which triggers the timer useEffect
setState(prev => ({
  ...prev,
  timeRemaining: QUESTION_TIME,
}));
```

**Fixed Code:**
```typescript
// CRITICAL: Reset local timeRemaining to ensure host timer starts fresh
// This must happen BEFORE the phase changes to 'question' which triggers the timer useEffect
setState(prev => ({
  ...prev,
  timeRemaining: QUESTION_TIME,
}));

// CRITICAL FIX: Mark timer as initialized for this question
// This prevents the realtime subscription from overwriting our fresh timer
// when it receives the DB update (which may have significant elapsed time due to latency)
timerInitializedForQuestionRef.current = state.currentQuestionIndex;
console.log('[startPlaying] Timer marked as initialized for question', state.currentQuestionIndex);
```

---

## Why This Fixes The Issue

The realtime subscription handler has this logic (lines 1746-1769):
```typescript
if (timerInitializedForQuestionRef.current !== currentQuestionIdx) {
  // Calculate timer from server time (can result in 5s due to latency)
  ...
  timerInitializedForQuestionRef.current = currentQuestionIdx;
} 
// If timer already initialized, keep prev.timeRemaining (preserves the 15s)
```

By setting `timerInitializedForQuestionRef.current = state.currentQuestionIndex` in `startPlaying()`, the subscription check will fail, and the host's timer will remain at 15 seconds.

---

## Flow After Fix

```text
BEFORE (Bug):
startPlaying() → timeRemaining = 15 → DB update
                                           ↓
Subscription fires (5s later) → timerRef NOT SET → recalculates to 5s
                                           ↓
Timer useEffect starts with timeRemaining = 5 ❌

AFTER (Fixed):
startPlaying() → timeRemaining = 15, timerRef = questionIndex → DB update
                                                                      ↓
Subscription fires (5s later) → timerRef MATCHES → SKIPS recalculation
                                                                      ↓
Timer useEffect starts with timeRemaining = 15 ✓
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/TVGameContext.tsx` | Add `timerInitializedForQuestionRef.current = state.currentQuestionIndex` after line 2388 |

---

## Expected Result

After this fix:
1. **Host always sees 15 seconds** when starting a question
2. **Players also see 15 seconds** (already working with late-join threshold)
3. **No more "time up" showing early** for the host
4. **Late joiners still sync correctly** to server time if they join mid-question

