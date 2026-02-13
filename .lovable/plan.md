

## Delay PRO Gift Modal Until Page Is Fully Rendered

### Problem
The gift modal currently opens after a fixed 1.5-second timeout, which can overlap with the page still loading/rendering (data fetching, animations, etc.). Users see the modal pop up before they've had a chance to see the main page content.

### Solution
Add a "page ready" check before starting the 2-second modal timer. The modal will only open after:
1. The VIP status has finished loading (`vipLoading === false`)
2. The user data is available
3. Then wait an additional 2 seconds before showing the modal

This ensures the main page renders completely first, then the modal appears smoothly.

### Technical Details

**File: `src/pages/Index.tsx`** (lines 211-216)

Update the `useEffect` that auto-opens the modal to also depend on `vipLoading`. Only start the 2-second timer once loading is complete:

```typescript
useEffect(() => {
  if (proGiftEligible && !proGiftClaimed && !proGiftDismissed && !vipLoading) {
    const timer = setTimeout(() => setProGiftModalOpen(true), 2000);
    return () => clearTimeout(timer);
  }
}, [proGiftEligible, proGiftClaimed, proGiftDismissed, vipLoading]);
```

Changes:
- Add `!vipLoading` condition so the timer only starts after data is loaded
- Increase delay from 1500ms to 2000ms
- Add `vipLoading` to dependency array

### Files to Edit
- `src/pages/Index.tsx` -- update the auto-open useEffect (1 line change)

