
# Move User Row to Top + Fix Trophy Cropping

## Current Issues

From the screenshot:
1. **User's avatar/username/coins row** is at the **bottom** of the screen, below the trophy
2. **Trophy is cropped** - the bottom portion of the trophy is cut off by the user row container
3. The layout should show the user info at the **top** (below league nav), with the trophy/background taking full remaining space

---

## Solution Overview

### New Layout Structure:
```
┌─────────────────────────────┐
│ Header: რეიტინგი    🔔       │
├─────────────────────────────┤
│ < ოქროს ლიგა      >         │  ← League nav
├─────────────────────────────┤
│ [Avatar] Username    🪙123   │  ← User row at TOP
├─────────────────────────────┤
│                             │
│   Background with Trophy    │
│   (fullscreen, no crop)     │
│                             │
│                             │
└─────────────────────────────┘
```

---

## Implementation Plan

### Part 1: Move User Row to Top

**File: `src/pages/Leaderboards.tsx`**

Move the collapsed user row from the bottom section (lines 242-295) to inside the sticky header area, directly below the league navigation.

**Changes:**
1. Add user row section inside the sticky header (after line 224)
2. Remove the bottom "collapsed" section that shows only user row
3. Keep the bottom section only for the expanded list (when tapped)

**New code structure for lines 183-250:**
```tsx
<div className="sticky top-0 left-0 right-0 z-50">
  {/* Header */}
  <div className="px-4 pt-4 pb-3 bg-background/95 backdrop-blur-md">
    ...
  </div>
  
  {/* League Navigation */}
  <div className="lg:hidden bg-background/95 backdrop-blur-md border-b border-border/20">
    ...
  </div>
  
  {/* User Row - Mobile only, at TOP below league nav */}
  <div className="lg:hidden bg-background/95 backdrop-blur-md border-b border-border/20 px-3">
    {isLoading ? (
      <SkeletonRow />
    ) : userEntry ? (
      <button onClick={() => setIsExpanded(true)} className="w-full">
        <LeaguePlayerRow entry={userEntry} isCurrentUser={true} ... />
      </button>
    ) : (
      <EmptyState />
    )}
  </div>
</div>
```

---

### Part 2: Fix Trophy Cropping

**File: `src/components/leaderboard/LeaderboardHeroBackground.tsx`**

The trophy is being cropped because:
- `object-cover object-top` positions the image from the top, cropping the bottom
- The `-mt-4` overlap from the bottom container also clips the trophy

**Fix:**
1. Change `object-top` to `object-center` so the trophy (which is centered) is fully visible
2. Since user row moves to top, remove the overlapping bottom container that was cropping the image

**Change on line 96:**
```tsx
// Before
className="w-full h-full object-cover object-top transition-opacity duration-500"

// After
className="w-full h-full object-cover object-center transition-opacity duration-500"
```

---

### Part 3: Simplify Bottom Section

**File: `src/pages/Leaderboards.tsx`**

Since the user row is now at the top:
1. Remove the collapsed state logic from the bottom section
2. The bottom section only shows when `isExpanded` is true (full leaderboard list)
3. Remove the `-mt-4` overlap that was causing cropping
4. Keep the pill handle for opening/closing the full list

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Move user row to sticky header, simplify bottom section |
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Change `object-top` to `object-center` for full trophy visibility |

---

## Visual Result

After these changes:
- **User row at top**: Avatar, username, rank, and coins appear right below the league navigation
- **Trophy fully visible**: The background image centers the trophy so it's not cropped
- **Tap to expand**: Tapping the user row or swipe-up opens the full leaderboard list from bottom
- **Cleaner layout**: Header → League Nav → User Stats → Full Trophy Background
