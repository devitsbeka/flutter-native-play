

## Update Play Button: Show "ითამაშე" Text for Unplayed Items

### Current Behavior
Both mobile feed cards and desktop portfolio cards show a small circle button for play -- solid purple when not played, outlined purple when played. There's no text label.

### New Behavior
- **Not played**: A white pill-shaped button with a purple border, a filled purple play icon on the left, and the text "ითამაშე" next to it
- **Already played**: Keep the current solid purple circle button with white play icon (no text, just the icon circle)

This applies to both components that render the play button in the explore feed.

### Technical Details

**File: `src/components/social/PlayerFeedItem.tsx`** (lines 317-328)

Replace the play button section:
- When `isPlayed` is false: Render a pill-shaped button (`rounded-full`) with white background, purple border (`border-2 border-purple-500`), containing a filled purple Play icon and the text "ითამაშე" in purple
- When `isPlayed` is true: Keep the existing solid purple circle button (`w-9 h-9 rounded-full bg-purple-500`) with a white Play icon, no text

**File: `src/components/social/TriviaPortfolioCard.tsx`** (lines 162-172)

Apply the same change to the desktop/tablet portfolio card play button:
- Not played: White pill button with purple stroke + purple play icon + "ითამაშე" text
- Played: Solid purple circle icon button (unchanged)

### Visual Summary

Not played button layout:
```text
[ ▶  ითამაშე ]   (white bg, purple border, purple icon + text)
```

Played button layout:
```text
  (●)             (solid purple circle, white icon, no text)
```

### Files Changed
- `src/components/social/PlayerFeedItem.tsx` -- update play button rendering
- `src/components/social/TriviaPortfolioCard.tsx` -- update play button rendering
