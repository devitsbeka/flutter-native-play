
# Fix Leaderboard Layout: Fullscreen Background + Leagues at Top

## Issues Identified

### Issue 1: White Space on Left/Right
The background image uses `object-contain` which preserves aspect ratio but leaves empty space on the sides, showing the gradient background.

**Current Code (LeaderboardHeroBackground.tsx, line 96):**
```tsx
className="w-full h-full object-contain object-center transition-opacity duration-500"
```

**Fix:** Change to `object-cover` to fill the full width, and remove the gradient background that shows through.

---

### Issue 2: League Navigation at Bottom Instead of Top
Currently the league title with left/right arrows is positioned at the bottom of the background, as a separate container that overlaps the hero.

**Requirement:** Move the league navigation (ოქროს ლიგა, ვერცხლის ლიგა, ბრინჯაოს ლიგა) to the **top** of the screen, below the header.

---

## Implementation Plan

### Part 1: Fix Background to Cover Full Width

**File: `src/components/leaderboard/LeaderboardHeroBackground.tsx`**

| Line | Change |
|------|--------|
| 92 | Remove gradient background: `bg-gradient-to-b from-primary/10 to-background` → remove this class |
| 96 | Change `object-contain` → `object-cover` to fill full width |

**Updated code:**
```tsx
<div className="absolute inset-0 w-full h-full">
  <img
    src={TIER_BACKGROUNDS[currentTier] ?? leaderboardBgSilver}
    alt=""
    className="w-full h-full object-cover object-top transition-opacity duration-500"
    loading="eager"
    draggable={false}
  />
</div>
```

---

### Part 2: Move League Navigation to Top

**File: `src/pages/Leaderboards.tsx`**

Restructure the mobile layout to:
1. Show league navigation directly below the header (inside the sticky header area or as a floating bar at top)
2. Keep the background as fullscreen
3. User row and list appear at bottom, overlapping the background

**New Structure:**
```
┌─────────────────────────────┐
│ Header: რეიტინგი    🔔       │
├─────────────────────────────┤
│ < ვერცხლის ლიგა      >      │  ← League nav at TOP
├─────────────────────────────┤
│                             │
│   ┌─────────────────┐       │
│   │                 │       │
│   │   Background    │       │
│   │   (fullscreen)  │       │
│   │                 │       │
│   └─────────────────┘       │
│                             │
├─────────────────────────────┤
│ User Row (collapsed)        │  ← Bottom panel
│ or Full Leaderboard List    │
└─────────────────────────────┘
```

**Changes to `src/pages/Leaderboards.tsx`:**

1. **Extract league navigation** from the bottom container
2. **Place it in the sticky header** section (lines 183-192), or as a separate sticky bar below the header
3. **Keep the background hero** extending below the navigation
4. **Bottom panel** contains only user row / expanded list

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Change `object-contain` to `object-cover`, remove gradient bg |
| `src/pages/Leaderboards.tsx` | Move league navigation to top, restructure mobile layout |

---

## Visual Result

After these changes:
- **Background fills full width** with no white space on sides
- **League navigation at top** with arrows to switch between leagues
- **User row at bottom** with tap-to-expand for full leaderboard
- Cleaner visual hierarchy: Header → League Nav → Background → User Panel
