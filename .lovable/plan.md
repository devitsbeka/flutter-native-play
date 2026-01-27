

# Fix Premature Question Advance After 5 Seconds

## Problem Analysis

When the game begins, questions are changing after ~5 seconds instead of waiting the full 15 seconds (or until all active players answer). This happens because:

1. **Time calculation issue**: The subscription handler recalculates `timeRemaining` from the server's `question_start_time` on every update while in 'playing' status
2. **Latency impact**: If there's network latency between when the server sets `question_start_time` and when the client receives the update, the calculated `timeRemaining` is lower than expected
3. **Overwriting local timer**: Once the local countdown timer is running, subscription updates can override it with a stale/calculated value

### Current Flow (Problematic)

```text
1. Server sets question_start_time = T0
2. Client receives update at T0 + 3 seconds (network delay)
3. Client calculates: elapsed = 3s, timeRemaining = 15 - 3 = 12s
4. Later subscription fires again at T0 + 8 seconds
5. Client recalculates: elapsed = 8s, timeRemaining = 15 - 8 = 7s (jumps backward!)
6. Timer expires prematurely
```

---

## Solution

Only set `timeRemaining` from server time on the **initial phase transition** to 'playing', then let the local timer run independently without further overrides.

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

#### 1. Track if timer has been initialized for current question (around line 215)

Add a ref to track whether the timer has been initialized for the current question:

```tsx
// Add after line 218 (checkInProgressRef declaration)
const timerInitializedForQuestionRef = useRef<number | null>(null);
```

#### 2. Only calculate timeRemaining on initial transition (lines 1701-1708)

Modify the subscription handler to only set `timeRemaining` from server time when first entering 'playing' phase for a new question:

**Current (lines 1701-1708):**
```tsx
setState(prev => {
  // Calculate time remaining if question just started
  let timeRemaining = prev.timeRemaining;
  if (newData.status === 'playing' && newData.question_start_time) {
    const startTime = new Date(newData.question_start_time).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
  }
```

**New:**
```tsx
setState(prev => {
  // Calculate time remaining ONLY on initial transition to playing for this question
  // Once timer is running locally, don't override it with server calculations
  let timeRemaining = prev.timeRemaining;
  const currentQuestionIdx = newData.current_question_index ?? prev.currentQuestionIndex;
  
  if (newData.status === 'playing' && newData.question_start_time) {
    // Only recalculate if this is a NEW question we haven't initialized timer for
    if (timerInitializedForQuestionRef.current !== currentQuestionIdx) {
      const startTime = new Date(newData.question_start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
      timerInitializedForQuestionRef.current = currentQuestionIdx;
      console.log('[Timer] Initialized for question', currentQuestionIdx, 'with', timeRemaining, 'seconds remaining');
    }
    // If timer already initialized for this question, keep prev.timeRemaining (local timer manages it)
  } else if (newData.status === 'countdown') {
    // Reset timer tracker for new countdown
    timerInitializedForQuestionRef.current = null;
    timeRemaining = QUESTION_TIME;
  }
```

#### 3. Reset timer tracker on question advance (around line 1641-1656)

Reset the timer tracker when a new question is detected:

**Add after line 1644:**
```tsx
// Reset timer initialization tracker for new question
timerInitializedForQuestionRef.current = null;
```

#### 4. Reset timer tracker on game reset (around line 2720, 2777, 2815)

Reset the timer tracker when the game is reset in `leaveSession`, `resetGame`, or initial state:

**Add after each `timeRemaining: QUESTION_TIME` line:**
```tsx
// Also reset: timerInitializedForQuestionRef.current = null;
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~215 | Add `timerInitializedForQuestionRef` to track timer initialization |
| Lines 1701-1708 | Only calculate `timeRemaining` from server on first transition to 'playing' |
| Line ~1644 | Reset timer tracker on new question detection |
| Lines 2720, 2777, 2815 | Reset timer tracker on game reset |

---

## Expected Result

- Timer starts at 15 seconds (or calculated remaining) only on initial question start
- Subsequent subscription updates during 'playing' phase don't override local timer
- Questions wait the full countdown time before advancing
- If all active players answer before time expires, auto-advance still works correctly

