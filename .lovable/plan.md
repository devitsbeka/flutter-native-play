

## Make Bronze League Trophy More Distinctly Bronze

### Problem
The Bronze (Tier 1) and Gold (Tier 3) league trophies in the badge row look too similar in color. Both use sepia-based CSS filters with close hue-rotation values (-10 vs +15 degrees), making them nearly indistinguishable.

### Fix

**File: `src/components/leaderboard/LeagueBadgeRow.tsx`** -- Update the Bronze filter (Tier 1)

Current bronze filter:
```
sepia(1) saturate(3) hue-rotate(-10deg) brightness(0.85)
```

New bronze filter with a stronger brown/copper shift, lower saturation and darker tone to clearly differentiate from gold:
```
sepia(1) saturate(2) hue-rotate(-25deg) brightness(0.7) contrast(1.1)
```

Key changes:
- **hue-rotate from -10 to -25 degrees** -- pushes further toward brown/copper, away from gold
- **saturate from 3 to 2** -- less vivid yellow, more muted earthy bronze
- **brightness from 0.85 to 0.7** -- darker overall, bronze is naturally darker than gold
- **Added contrast(1.1)** -- makes the bronze details pop more despite lower brightness

This is a one-line change in a single file.
