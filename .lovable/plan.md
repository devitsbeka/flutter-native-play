
# Fix Leaderboard: Static Background, Transparent Leagues, Single User Row

## Issues from Screenshots

1. **Background scrolls with content** - Should be fixed/static behind everything
2. **League navigation is opaque** - Should be transparent to see trophy background
3. **User avatar appears 3 times** when list is expanded:
   - Once in the sticky header (top)
   - Once in the scrollable list (correct position)
   - Once in the fixed bottom bar (redundant)

## Solution

### Part 1: Make Background Fixed (Not Scrolling)

**File: `src/components/leaderboard/LeaderboardHeroBackground.tsx`**

Change the container position from `relative` to `fixed` for mobile, so the background stays in place while content scrolls over it.

| Line | Change |
|------|--------|
| 77-84 | Change mobile container to use `fixed inset-0` positioning |

```tsx
// Before
className={`relative w-full overflow-hidden...`}

// After (mobile)
className={`${isMobile ? 'fixed inset-0' : 'relative w-full'} overflow-hidden...`}
```

Also need to add a spacer in the parent component so content flows properly.

---

### Part 2: Make League Navigation Transparent

**File: `src/pages/Leaderboards.tsx`**

Remove the opaque background from the league navigation and user row containers.

| Location | Current | Change To |
|----------|---------|-----------|
| Line 194 | `bg-background/95 backdrop-blur-md` | `bg-transparent` |
| Line 227 | `bg-background/95 backdrop-blur-md border-b...` | Remove entirely (see Part 3) |

---

### Part 3: Show User Only Once in Leaderboard List

Remove the user row from the sticky header entirely. The user should only appear:
- In the leaderboard list at their actual rank position (when expanded)

**Changes to `src/pages/Leaderboards.tsx`:**

1. **Delete lines 226-260**: Remove the entire "User Row - Mobile only, at TOP" section from the sticky header
2. **Keep lines 322-338**: The user row inside the leaderboard list (this is the correct place)
3. **Keep lines 347-378**: The fixed bottom bar that appears only when user scrolls past their row (this is a navigation aid)

**New collapsed state behavior:**
- When collapsed: Show only the background with trophy + transparent league navigation at top
- Tapping anywhere on the background or a "See Rankings" button expands the list
- When expanded: Show the full leaderboard list with user at their correct position

---

### Part 4: Add Tap Target for Expanding List

Since we're removing the user row from the top, add a clear call-to-action to expand the list.

Add a floating button at the bottom of the background (when collapsed):
```tsx
{!isExpanded && (
  <button 
    onClick={() => setIsExpanded(true)}
    className="absolute bottom-20 left-1/2 -translate-x-1/2 
               bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 
               shadow-lg border border-border/30"
  >
    <span className="text-sm font-medium text-foreground">
      ნახე რეიტინგი
    </span>
  </button>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Make background `fixed` for mobile |
| `src/pages/Leaderboards.tsx` | Remove user row from header, make league nav transparent, add expand button |

---

## Visual Result

**Collapsed State:**
```
┌─────────────────────────────┐
│ რეიტინგი            🔔       │ ← Header (opaque)
├─────────────────────────────┤
│ < ოქროს ლიგა      >         │ ← League nav (transparent)
│                             │
│                             │
│     🏆 (Fixed Background)   │
│                             │
│       [ნახე რეიტინგი]       │ ← Tap to expand
│                             │
└─────────────────────────────┘
```

**Expanded State:**
```
┌─────────────────────────────┐
│ რეიტინგი            🔔       │
├─────────────────────────────┤
│ ─────── (drag handle) ───── │
│ 1. User A         🪙 1,411K │
│ 2. User B         🪙 56,373 │
│ 3. User C         🪙 52,342 │ ← List with user at correct rank
│ ...                         │
└─────────────────────────────┘
```
