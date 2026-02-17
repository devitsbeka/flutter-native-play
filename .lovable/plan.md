

## Fix: "დაწყება" Button Stays Disabled After Category Is Shown

### Problem

After the category slot machine lands, the stage transitions to "ready" after a fixed 400ms delay, which makes the "დაწყება" button visible. However, the button remains **disabled** until `prefetchReady` becomes `true` -- which depends on a network request to fetch questions. If that request takes longer than 400ms (common on slow connections), the user sees a visible but unclickable button with no indication of why.

### Root Cause

Line 338 in `src/components/game/VSScreen.tsx`:
```
const startButtonDisabled = !showStartButton || !prefetchReady || isStarting;
```

The `prefetchReady` flag blocks the button even though the game can still work without pre-fetched questions (the `beginPlaying` function fetches them as a fallback).

### Fix

**File: `src/components/game/VSScreen.tsx`**

1. **Remove `prefetchReady` from the disabled condition** -- The button should always be clickable once the stage is "ready". Pre-fetched questions are an optimization, not a requirement.

2. **Show loading state in button text** -- If user clicks before prefetch completes, show "იტვირთება..." (Loading) text. The existing `isStarting` state already handles this since `beginPlaying` is async.

### Change

Line 338:
```
Before: const startButtonDisabled = !showStartButton || !prefetchReady || isStarting;
After:  const startButtonDisabled = !showStartButton || isStarting;
```

This is a single-line change. The button will be clickable immediately when the category is revealed. If the user clicks before prefetch finishes, `beginPlaying` will fetch questions on its own (this fallback already exists), and the button shows "იტვირთება..." during that time via the `isStarting` state.

