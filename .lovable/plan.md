

## Fix: Sticky User Position Bar in League Leaderboard

### Problem
The sticky bar at the bottom (showing the user's own rank, avatar, and coins) already exists in code but doesn't work reliably. The root cause is the `IntersectionObserver` uses `root: null` (the browser viewport), but the leaderboard list scrolls inside a nested `overflow-y-auto` container within the bottom sheet. This means the observer thinks the user's row is "visible" even when it's scrolled out of view within the sheet, so the fixed bar never appears.

### Fix

**File: `src/pages/Leaderboards.tsx`**

1. **Add a ref for the scroll container** -- Create a `scrollContainerRef` attached to the scrollable div (line 316, the `div.flex-1.overflow-y-auto`).

2. **Update IntersectionObserver to use the correct root** -- Change the observer's `root` from `null` to `scrollContainerRef.current` so it correctly detects when the user's row scrolls out of the inner container.

3. **Simplify the fixed bar visibility** -- Instead of only showing when the user's row is not intersecting, also ensure it shows immediately when expanded and the user is viewing their own league. Default `showFixedBar` to `true` and only hide it when the user's row is confirmed visible in the scroll container.

4. **Adjust z-index and positioning** -- Move the fixed bar inside the bottom sheet's motion container (before the closing tag at line 363) and position it as `sticky bottom-0` within the sheet, rather than `fixed bottom-28` outside. This ensures it sits right above the bottom of the sheet and doesn't conflict with the nav bar.

### Technical Details

```text
Before:
  - IntersectionObserver root: null (viewport)
  - Fixed bar: outside bottom sheet, position fixed, bottom-28, z-40
  - Result: observer never triggers because row is "in viewport"

After:
  - IntersectionObserver root: scrollContainerRef (inner scroll div)
  - Fixed bar: inside bottom sheet, sticky bottom-0
  - Result: observer correctly detects row visibility within scroll area
```

Changes summary:
- Add `scrollContainerRef` to the scrollable div
- Pass `scrollContainerRef.current` as `root` in IntersectionObserver
- Move the fixed user bar inside the bottom sheet container, positioned as `sticky bottom-0` with a background blur
- Remove the old fixed bar from outside the bottom sheet
