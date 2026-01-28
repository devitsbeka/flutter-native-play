
# Plan: Fix Poll Results Screen Showing Empty After Starting New Poll

## Problem Summary

When clicking "არჩევნების დაწყება" (Start Poll) after completing several rounds, the controller displays an empty "ხმის მიცემის შედეგები" (Voting Results) screen with "რაუნდების რაოდენობა:" (Number of rounds:) and "დაწყება (3 რაუნდი)" button, but no category suggestions are visible. The host cannot add suggestions because the wrong screen is being rendered.

## Root Cause

The phase mapping logic in `TVHostController.tsx` has a flawed conditional override:

```typescript
// Line 152-153
if (pollHook.pollPhase === 'results' && (rawLocalPhase === 'poll-voting' || rawLocalPhase === 'poll-suggest')) {
  localPhase = 'poll-results';
}
```

**What happens when `initiatePoll()` is called:**

1. Database status changes to `poll-suggest` ✓
2. `contextPhase` correctly becomes `poll-suggest` ✓
3. `rawLocalPhase` correctly becomes `poll-suggest` ✓
4. `pollHook.pollPhase` is still `'results'` (stale from previous session state)
5. The condition `pollHook.pollPhase === 'results' && rawLocalPhase === 'poll-suggest'` matches!
6. `localPhase` is incorrectly overridden to `'poll-results'`
7. The empty `ControllerPollResults` screen is shown instead of `ControllerPollScreen`

```text
Expected Flow:
┌─────────────────┐     ┌─────────────────────┐
│ initiatePoll()  │────►│ poll-suggest phase  │────► Host adds suggestions
└─────────────────┘     │ ControllerPollScreen│
                        └─────────────────────┘

Actual (Buggy) Flow:
┌─────────────────┐     ┌───────────────────────┐
│ initiatePoll()  │────►│ poll-results phase    │────► Empty results screen
└─────────────────┘     │ ControllerPollResults │
                        └───────────────────────┘
```

## Solution

The override logic should only activate when transitioning FROM `poll-voting` TO `poll-results`. It should NOT override when going FROM `completed/results` TO `poll-suggest` (starting a new poll).

### File: `src/pages/TVHostController.tsx`

**Change the conditional logic at lines 152-159:**

**Before:**
```typescript
// Override with poll hook state if we're in poll phases
// The poll hook subscribes to the same DB but updates its local state immediately after endVoting()
if (pollHook.pollPhase === 'results' && (rawLocalPhase === 'poll-voting' || rawLocalPhase === 'poll-suggest')) {
  localPhase = 'poll-results';
} else if (pollHook.pollPhase === 'voting' && rawLocalPhase !== 'poll-voting' && rawLocalPhase !== 'poll-results') {
  // If poll is in voting phase but context hasn't caught up, show voting
  if (contextPhase.includes('poll')) {
    localPhase = 'poll-voting';
  }
}
```

**After:**
```typescript
// Override with poll hook state if we're in poll phases
// The poll hook subscribes to the same DB but updates its local state immediately after endVoting()
// CRITICAL: Only override poll-voting → poll-results, NOT poll-suggest → poll-results
// When starting a new poll (initiatePoll), pollHook.pollPhase may still be 'results' from stale state
// We must NOT override poll-suggest to poll-results in that case
if (pollHook.pollPhase === 'results' && rawLocalPhase === 'poll-voting') {
  // Only override when transitioning from voting to results (endVoting flow)
  localPhase = 'poll-results';
} else if (pollHook.pollPhase === 'voting' && rawLocalPhase !== 'poll-voting' && rawLocalPhase !== 'poll-results') {
  // If poll is in voting phase but context hasn't caught up, show voting
  if (contextPhase.includes('poll')) {
    localPhase = 'poll-voting';
  }
}
```

**Key Change:** Remove `rawLocalPhase === 'poll-suggest'` from the first condition. The override from `poll-results` should only happen when the context phase is `poll-voting`, not when it's `poll-suggest`.

---

## Why This Fix Works

| Scenario | Before | After |
|----------|--------|-------|
| Start new poll from completed | `pollHook.pollPhase='results'`, `rawLocalPhase='poll-suggest'` → Shows `poll-results` (WRONG) | Same condition but `poll-suggest` is not matched → Shows `poll-suggest` (CORRECT) |
| End voting after timer | `pollHook.pollPhase='results'`, `rawLocalPhase='poll-voting'` → Shows `poll-results` (CORRECT) | Same condition still matches → Shows `poll-results` (CORRECT) |
| During voting phase | Works correctly | Works correctly (no change) |

---

## Summary

| File | Line | Change |
|------|------|--------|
| `src/pages/TVHostController.tsx` | 152-153 | Remove `rawLocalPhase === 'poll-suggest'` from the poll-results override condition |

---

## Testing Checklist

1. Play several rounds until game completes
2. Click "არჩევნების დაწყება" (Start Poll) button
3. Verify the poll suggestion screen appears (host can add categories)
4. Add some category suggestions
5. Start voting phase
6. When voting ends, verify poll results screen shows the added categories
7. Click "Start Game" - verify game starts correctly
