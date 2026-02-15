
## Fix: Both Buttons Showing Loading State

### Problem
On the multiplayer results screen (`GameResultsScreenV2.tsx`), when the host clicks "გაგრძელება" (Continue), both the Continue button AND the "კატეგორიის დამატება" (Add Category) button show a loading spinner. This is because both buttons share the same `isStartingRematch` state for their `disabled` and `icon` props.

### Fix

#### File: `src/components/team/GameResultsScreenV2.tsx` (lines 594-604)

The "კატეგორიის დამატება" button should:
- Still be **disabled** while a rematch is starting (to prevent double actions) -- this is correct
- But NOT show the loading spinner icon -- it should keep its normal chevron icon

Change line 601 from:
```tsx
icon={isStartingRematch ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
```
to:
```tsx
icon={<ChevronRight className="w-5 h-5" />}
```

Similarly, update the button text on line 603 to always show the normal text (not the "loading" text):
```tsx
კატეგორიის დამატება
```
(This line already shows the correct text when not loading, but the ternary currently shows `t("game.starting")` during loading -- remove that.)

This way, only the button that was actually clicked shows the loading state.
