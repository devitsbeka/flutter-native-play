

## Fix Bronze League Trophy Color

### Problem
The Bronze league (Tier 1) trophy uses `filter: "none"`, which displays the original trophy image as-is -- and that image is gold-colored. Meanwhile the Gold league (Tier 3) also looks gold via its sepia filter. So both Bronze and Gold look identical.

### Fix
Change the CSS filter for Tier 1 (Bronze) from `"none"` to a filter that shifts the trophy to a distinct bronze/copper tone -- darker, warmer, and more reddish-brown than gold.

### File: `src/components/leaderboard/LeagueBadgeRow.tsx`

Update line 7:

**From:**
```
1: "none", // Original gold trophy - no filter
```

**To:**
```
1: "sepia(1) saturate(3) hue-rotate(-10deg) brightness(0.85)", // Bronze (warm copper/brown)
```

This applies a warm sepia base with slight red shift (`hue-rotate(-10deg)`) and reduced brightness to create a distinct darker bronze/copper appearance, clearly different from the bright gold of Tier 3.

### Only one line changes in one file.

