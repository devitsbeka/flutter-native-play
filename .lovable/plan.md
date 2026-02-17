

## Fix: TV Results Screen Cropping Other Players

### Problem

The results screen uses `min-h-screen` (allows growing beyond viewport) with `overflow-hidden` (clips anything that overflows). The podium section has `flex-1` which greedily takes available space, pushing "other players" below the viewport where they get clipped.

### Fix

**File: `src/components/tv/TVResultsScreen.tsx`**

1. Change the root container from `min-h-screen` to `h-screen` -- lock to exactly viewport height, never exceed it
2. Change the podium section from `flex-1` (greedy) to `flex-shrink` -- let it share space but shrink if needed
3. Wrap the "other players" grid in a scrollable container with `overflow-y-auto` and `min-h-0` so all players are accessible even with many participants
4. Reduce some spacing/sizes slightly to maximize vertical space:
   - Reduce podium block heights (`h-28` to `h-24`, `h-20` to `h-16`, `h-14` to `h-10`)
   - Reduce header margin
   - Reduce avatar/medal sizes slightly

### Technical Details

**Root container (line 67):**
```
Before: min-h-screen ... overflow-hidden ... flex flex-col
After:  h-screen ... overflow-hidden ... flex flex-col
```

**Podium section (line 119):**
```
Before: flex items-end justify-center gap-3 mb-4 flex-1
After:  flex items-end justify-center gap-3 mb-2 flex-shrink-0
```

**Podium block heights (line 168):**
```
Before: h-28 / h-20 / h-14
After:  h-20 / h-14 / h-10
```

**Other players section (lines 177-203):**
- Add `flex-1 min-h-0 overflow-y-auto` to the wrapper so it scrolls if needed rather than being clipped
- Reduce gap from `gap-3` to `gap-2` and padding from `p-3` to `p-2`

**Play again hint (line 207):**
- Keep `flex-shrink-0` so it always stays visible at the bottom

This ensures all content fits within the TV viewport, and if there are many "other players", they scroll within their section rather than overflowing off-screen.

