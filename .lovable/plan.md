
# Desktop & Tablet Leaderboard Redesign

## Current Behavior

| Screen | Breakpoint | Current Implementation |
|--------|------------|------------------------|
| Desktop | `lg:` (1024px+) | Big background with all trophies + 3 cards side-by-side |
| Tablet | `md-lg` (768-1023px) | Same as mobile - single tier background, swipe to change |
| Mobile | `< md` (< 768px) | Single tier background + expandable list from bottom |

## Requested Changes

Based on the reference screenshots:

**Desktop (lg+):** Keep as-is - background with all trophies + 3 league cards side-by-side

**Tablet (md to lg):** New layout:
- Full background image (`bgleader.png`) showing all 3 trophies
- League navigation at top (like mobile) with left/right arrows
- Large centered trophy for the selected tier (overlaid on background)
- "View Rating" button that opens a modal/slide-up panel with the leaderboard list

---

## Implementation Plan

### 1. Update LeaderboardHeroBackground Component

Modify to support 3 modes:
- **Mobile** (`isMobile=true`): Current tier-specific backgrounds
- **Tablet** (`isTablet=true`): Full desktop background (`bgleader.png`)  
- **Desktop** (default): Full desktop background with fade mask

```text
File: src/components/leaderboard/LeaderboardHeroBackground.tsx

Changes:
- Add isTablet prop
- When isTablet=true, show bgleader.png without fade mask
```

### 2. Restructure Leaderboards.tsx Breakpoints

Create a dedicated tablet layout between mobile and desktop:

```text
Current structure:
- Desktop (lg:): DesktopLeaderboards (3 columns)
- Mobile/Tablet (lg:hidden): Fullscreen with expandable list

New structure:
- Desktop (lg:): DesktopLeaderboards (3 columns) - unchanged
- Tablet (md:block lg:hidden): New tablet layout with:
  - Full bgleader.png background
  - League nav at top (arrows + title)
  - Large trophy overlay for selected tier (centered)
  - "View Rating" button
  - Modal/sheet for leaderboard list when opened
- Mobile (md:hidden): Current mobile implementation
```

### 3. Create TabletLeaderboards Component

New component features:
- Uses `bgleader.png` as full background
- League navigation header (same as mobile - arrows + league name)
- Large trophy image centered on screen (from individual trophy PNGs)
- "View Rating" button at bottom
- Opens a Dialog/Sheet with the full leaderboard list when clicked

```text
Layout:
+----------------------------------+
|  < SILVER LEAGUE >               |  <- League nav with arrows
+----------------------------------+
|                                  |
|    [Background: bgleader.png]    |
|                                  |
|        [Large Trophy]            |  <- Trophy overlay for selected tier
|                                  |
|     [ View Rating Button ]       |
|                                  |
+----------------------------------+
```

### 4. Create Tablet Leaderboard Modal

When "View Rating" is clicked, show a dialog/sheet containing:
- League header
- Scrollable list of players (same as mobile expanded view)
- Close button

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Add tablet breakpoint, create TabletLeaderboards component |
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Add isTablet mode for full background without mask |

## Technical Details

### Breakpoint Strategy
```text
- md:hidden lg:hidden  -> Mobile only
- hidden md:block lg:hidden -> Tablet only  
- hidden lg:block -> Desktop only
```

### Trophy Overlay Sizing
- Use the individual trophy images (trophy-silver.png, trophy-gold.png, trophy-bronze.png)
- Center on screen with size ~40-50% of viewport width
- Add subtle shadow/glow effect

### Modal Implementation
- Use existing Dialog or Sheet component
- Same player row rendering as mobile expanded view
- ScrollArea for the list
