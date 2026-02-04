
# League Header Redesign - Tablet & Desktop

## Overview

Update both Tablet and Desktop views to:
1. Add a small trophy icon before the league title text
2. Make the league header container have a blurred/frosted glass effect
3. Remove the large centered trophy element from tablet view (already visible in background)
4. Apply the same league navigation style to desktop (currently shows 3 columns)

---

## Changes for Tablet View

### Current Layout
```text
+----------------------------------+
|  <   ᲕᲔᲠᲪᲮᲚᲘᲡ ᲚᲘᲒᲐ   >          |  <- No blur, no trophy icon
+----------------------------------+
|                                  |
|        [Large Trophy]            |  <- Remove this
|                                  |
|     [ View Rating Button ]       |
+----------------------------------+
```

### New Layout
```text
+----------------------------------+
|  [blur container]                |
|  < 🏆 ᲕᲔᲠᲪᲮᲚᲘᲡ ᲚᲘᲒᲐ   >          |  <- Trophy icon + blur background
+----------------------------------+
|                                  |
|    [Background with trophies]    |  <- No overlay trophy
|                                  |
|     [ View Rating Button ]       |
+----------------------------------+
```

### Technical Changes

In `TabletLeaderboards` function (~lines 462-522):

1. **Add trophy icon before title**:
   - Import and use `TROPHY_IMAGES[currentTier]` as a small icon (24-32px)
   - Place it inline with the league name

2. **Make header container blurry**:
   - Wrap the navigation row in a container with `bg-white/30 backdrop-blur-xl rounded-2xl`

3. **Remove large trophy section**:
   - Delete the entire center trophy `<div>` block (lines 493-507)
   - Adjust flex layout to center the "View Rating" button

---

## Changes for Desktop View

### Current Layout
```text
+----------------------------------+
|    [Background with trophies]    |
+----------------------------------+
| [Silver Card] [Gold Card] [Bronze Card] |  <- 3 columns
+----------------------------------+
```

### New Layout
```text
+----------------------------------+
|  [blur container]                |
|  < 🏆 ᲕᲔᲠᲪᲮᲚᲘᲡ ᲚᲘᲒᲐ   >          |  <- League nav at top like tablet
+----------------------------------+
|    [Background with trophies]    |
|                                  |
| [Silver Card] [Gold Card] [Bronze Card] |  <- Keep 3 columns
+----------------------------------+
```

### Technical Changes

In `DesktopLeaderboards` function (~lines 382-425):

1. **Add league navigation header** at the top with:
   - Left/right arrows for tier switching
   - Trophy icon + league name in center
   - Blurred background container (`bg-white/30 backdrop-blur-xl`)

2. **Add state for active tier** to track which league is selected on desktop

3. **Highlight the active column** based on the selected tier

---

## File Modifications

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Update TabletLeaderboards: add blur container, trophy icon, remove center trophy. Update DesktopLeaderboards: add league nav header with blur |

---

## Implementation Details

### Tablet Header Container Style
```tsx
<div className="mx-4 my-4 p-2 bg-white/30 backdrop-blur-xl rounded-2xl border border-white/20">
  <div className="flex items-center justify-between">
    <button>...</button>
    <div className="flex items-center gap-2">
      <img src={TROPHY_IMAGES[currentTier]} className="w-6 h-6" />
      <h2>{LEAGUE_NAMES[currentTier]}</h2>
    </div>
    <button>...</button>
  </div>
</div>
```

### Desktop Header (New)
```tsx
<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4">
  <div className="bg-white/30 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
    <div className="flex items-center gap-4">
      <button onClick={prevTier}>←</button>
      <div className="flex items-center gap-2">
        <img src={TROPHY_IMAGES[tier]} className="w-6 h-6" />
        <span>{leagueName}</span>
      </div>
      <button onClick={nextTier}>→</button>
    </div>
  </div>
</div>
```
