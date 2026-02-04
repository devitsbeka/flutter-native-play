
# Leaderboard Redesign - Fullscreen League View

## Overview

Redesign the leaderboards page to show fullscreen league backgrounds with a collapsed/expanded view:

| State | View |
|-------|------|
| **Collapsed (Default)** | Fullscreen background + league titles at bottom + only current user's row |
| **Expanded (On Tap)** | Same background + scrollable list of all players |

## Three Leagues

| League | Georgian | Background |
|--------|----------|------------|
| Gold | ოქროს ლიგა | leaderboard-bg-gold.png |
| Silver | ვერცხლის ლიგა | leaderboard-bg-silver.png |  
| Bronze | ბრინჯაოს ლიგა | leaderboard-bg-bronze.png |

---

## Implementation

### New Mobile Layout Structure

```
┌─────────────────────────────────┐
│ Header (რეიტინგი + bell)        │
├─────────────────────────────────┤
│                                 │
│  FULLSCREEN BACKGROUND IMAGE    │
│  (takes most of screen)         │
│                                 │
├─────────────────────────────────┤
│ ◀ ოქროს ლიგა ▶                 │  ← League title + nav arrows
├─────────────────────────────────┤
│ [My Avatar] [Username] [Coins]  │  ← Only my row (collapsed)
└─────────────────────────────────┘

When tapped on league title/my row:

┌─────────────────────────────────┐
│ Header                          │
├─────────────────────────────────┤
│  BACKGROUND (smaller)           │
├─────────────────────────────────┤
│ ◀ ოქროს ლიგა ▶  (tap to close) │
├─────────────────────────────────┤
│ [Scrollable player list]        │
│   1. Player1  🪙 50,000         │
│   2. Player2  🪙 45,000         │
│   ...                           │
│   [My row highlighted]          │
│   ...                           │
└─────────────────────────────────┘
```

### Key Changes

1. **Fullscreen Background**: Background image takes ~70% of screen height
2. **League Navigation**: Title bar at bottom with left/right arrows
3. **Collapsed State**: Show only current user's avatar, username, coins
4. **Expanded State**: On tap, expand to show full scrollable leaderboard
5. **Swipe Support**: Swipe left/right on background to change leagues

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Implement new collapsed/expanded view for mobile |
| `src/components/leaderboard/LeaderboardHeroBackground.tsx` | Make fullscreen capable |

---

## State Management

```tsx
const [isExpanded, setIsExpanded] = useState(false);

// Collapsed: Show only userEntry
// Expanded: Show full leaderboard list
```

---

## UI Details

1. **League Title Bar**: 
   - Left/right arrow buttons for navigation
   - League name in center (ოქროს ლიგა, ვერცხლის ლიგა, ბრინჯაოს ლიგა)
   - Tappable to expand/collapse

2. **Collapsed User Row**:
   - Avatar (circular)
   - Username
   - Coin icon + coin count
   - Subtle tap indicator

3. **Expanded List**:
   - Smooth scroll area
   - Current user highlighted
   - All players visible
