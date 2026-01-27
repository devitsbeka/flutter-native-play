
# Fix: Button Click Issues and Timer Desync Between Host and Players

## Summary of Issues

### Issue 1: Button Not Clickable / Two Different Screens
The host sees different screens based on whether `hasQueue` is true:
- When `hasQueue === true`: Shows **Lobby screen** with "დაწყება" button (works)
- When `hasQueue === false`: Shows **ControllerDirectSelection** with "თამაშის დაწყება" button (may not work)

The problem is that after a game ends and the status becomes `category-select`, the `hasQueue` value depends on async fetching. If the fetch is incomplete, the wrong screen is shown.

**Root Cause (line 146 in TVHostController.tsx):**
```typescript
let localPhase: LocalPhase = (rawLocalPhase === 'category-select' && hasQueue) ? 'lobby' : rawLocalPhase;
```

### Issue 2: Timer Shows 15s for Players but 5s for Host
The timer fix I implemented only affects the **realtime subscription handler** that processes incoming updates. However, the **host** experiences a different code path:

1. Host calls `startPlaying()` which sets `question_start_time` in DB
2. Realtime subscription fires, but host may already be in `question` phase
3. Timer `useEffect` starts counting down from whatever `state.timeRemaining` currently is
4. If `state.timeRemaining` was stale (e.g., 5 from a previous question), timer starts from 5

**Root Cause:** The host needs to explicitly reset `timeRemaining` to `QUESTION_TIME` when transitioning to `playing` phase, independent of the realtime subscription.

---

## Technical Solution

### Fix 1: Consistent Phase Display for Category Selection

**File: `src/pages/TVHostController.tsx`**

Remove the automatic conversion from `category-select` to `lobby` based on `hasQueue`. Instead, always show `ControllerDirectSelection` when the context phase is `category-select`. The queue data will be fetched and displayed within that component.

**Change at line 146:**
```typescript
// BEFORE
let localPhase: LocalPhase = (rawLocalPhase === 'category-select' && hasQueue) ? 'lobby' : rawLocalPhase;

// AFTER - Don't convert category-select to lobby based on hasQueue
// This ensures consistent screen regardless of queue fetch timing
let localPhase: LocalPhase = rawLocalPhase;
```

### Fix 2: Reset Timer in startPlaying Function

**File: `src/contexts/TVGameContext.tsx`**

In the `startPlaying` function, explicitly set `timeRemaining` to `QUESTION_TIME` before the phase transition. This ensures the host starts with the full timer regardless of realtime subscription timing.

**Add after line 2376 (after the DB update):**
```typescript
// CRITICAL: Reset local timeRemaining to ensure host timer starts fresh
// This must happen BEFORE the phase changes to 'question' which triggers the timer useEffect
setState(prev => ({
  ...prev,
  timeRemaining: QUESTION_TIME,
}));
```

### Fix 3: Timer Reset for All Question Transitions

**File: `src/contexts/TVGameContext.tsx`**

In the reveal-to-next-question transition (around line 1200), ensure `timeRemaining` is reset to `QUESTION_TIME`:

**Add to the transition logic:**
```typescript
// Reset timer for next question
setState(prev => ({ ...prev, timeRemaining: QUESTION_TIME }));
```

---

## Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/TVHostController.tsx` | Remove `hasQueue` condition on line 146 | Consistent screen display |
| `src/contexts/TVGameContext.tsx` | Add timer reset in `startPlaying` | Host timer starts at 15s |
| `src/contexts/TVGameContext.tsx` | Add timer reset in reveal→question transition | All questions start at 15s |

---

## Explanation

```text
CURRENT FLOW (Bug):
┌─────────────────┐   startPlaying()   ┌─────────────────┐
│ countdown phase │ ─────────────────► │ playing phase   │
│ timeRemaining=15│                    │ timeRemaining=? │ ← May be stale!
└─────────────────┘                    └─────────────────┘
                                                │
                                                ▼
                                       Timer useEffect
                                       starts countdown
                                       from stale value

FIXED FLOW:
┌─────────────────┐   startPlaying()   ┌─────────────────┐
│ countdown phase │ ─────────────────► │ playing phase   │
│ timeRemaining=15│    setState()      │ timeRemaining=15│ ← Always fresh!
└─────────────────┘       ↓            └─────────────────┘
              timeRemaining = 15
```

---

## Expected Results

After these fixes:
1. **Category Selection Screen**: Always shows `ControllerDirectSelection` when in `category-select` phase, regardless of queue loading state
2. **Start Button**: Will work on first click (fixed footer already in place)
3. **Timer Sync**: Both host and players will see 15 seconds when a question starts
4. **No more refresh needed**: Screen will be consistent on first load
