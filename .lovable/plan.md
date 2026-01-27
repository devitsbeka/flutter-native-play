
# Fix: Timer Showing Only 5 Seconds Instead of 15

## Problem Identified

The timer shows only ~5 seconds instead of the full 15 seconds when a question starts. This happens because:

1. **Host sets `question_start_time`** in the database when transitioning to `playing` status
2. **Realtime update propagates** to player devices (takes 1-3+ seconds depending on network)
3. **Player's client calculates** `timeRemaining = 15 - elapsed` where `elapsed = Date.now() - question_start_time`
4. **Result**: If there's 10 seconds of latency, timer shows only 5 seconds

The current logic at lines 1741-1748 in `TVGameContext.tsx`:
```typescript
if (newData.status === 'playing' && newData.question_start_time) {
  if (timerInitializedForQuestionRef.current !== currentQuestionIdx) {
    const startTime = new Date(newData.question_start_time).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeRemaining = Math.max(0, QUESTION_TIME - elapsed);  // Bug: Already reduced!
  }
}
```

## Root Cause

The design assumes server time synchronization is necessary for all clients, but this creates poor UX because:
- Network latency causes significant elapsed time before clients receive the update
- Players feel cheated when they only see 5 seconds to answer
- The server timestamp approach is only useful for **late joiners** who need to sync to an in-progress question

## Solution

Change the timer initialization logic to:
1. **For phase transitions (countdown → question)**: Always start with full `QUESTION_TIME` (15 seconds)
2. **For late joiners (joining mid-question)**: Use server timestamp calculation (current behavior)
3. **Detect late join**: If `elapsed > 3 seconds`, we're likely a late joiner

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Lines 1741-1749: Modify timer initialization logic**

```text
CURRENT (Bug):
const elapsed = Math.floor((Date.now() - startTime) / 1000);
timeRemaining = Math.max(0, QUESTION_TIME - elapsed);

FIXED:
1. Calculate elapsed time from server
2. If elapsed <= 3 seconds, treat as "fresh start" → use full QUESTION_TIME
3. If elapsed > 3 seconds, treat as "late joiner" → use calculated timeRemaining
```

**Specific code change:**

```typescript
if (newData.status === 'playing' && newData.question_start_time) {
  if (timerInitializedForQuestionRef.current !== currentQuestionIdx) {
    const startTime = new Date(newData.question_start_time).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // LATE JOINER THRESHOLD: If more than 3 seconds have elapsed,
    // the player is likely joining mid-question and needs sync.
    // Otherwise, this is a fresh question start and we give full time.
    const LATE_JOIN_THRESHOLD = 3;
    
    if (elapsed > LATE_JOIN_THRESHOLD) {
      // Late joiner - sync to server time
      timeRemaining = Math.max(0, QUESTION_TIME - elapsed);
      console.log('[Timer] Late join sync for question', currentQuestionIdx, 
        'elapsed:', elapsed, 'remaining:', timeRemaining);
    } else {
      // Fresh question start - give full time
      timeRemaining = QUESTION_TIME;
      console.log('[Timer] Fresh start for question', currentQuestionIdx, 
        'ignoring elapsed:', elapsed, 'giving full:', QUESTION_TIME);
    }
    
    timerInitializedForQuestionRef.current = currentQuestionIdx;
  }
}
```

---

## Why This Fixes the Issue

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Normal game flow (countdown → question) | Shows 5-10 seconds (due to latency) | Shows full 15 seconds |
| Late joiner (joins mid-question) | Syncs correctly to server time | Still syncs correctly |
| Page refresh during question | Syncs correctly to server time | Still syncs correctly |

The 3-second threshold is chosen because:
- Normal realtime propagation takes 0.5-2 seconds
- If more than 3 seconds have elapsed, the player is definitely late
- This provides buffer for slow networks while still fixing the main issue

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/TVGameContext.tsx` | Modify timer initialization at lines 1741-1749 to use late-joiner threshold |

---

## Expected Result

After this fix:
1. **Questions always show 15 seconds** for players who were in the game during countdown
2. **Late joiners still sync** to the correct remaining time
3. **Reveal duration remains 10 seconds** when no one answered (unchanged)
