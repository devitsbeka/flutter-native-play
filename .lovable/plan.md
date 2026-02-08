

## Scroll to Filter Bar Position (Not Page Top) When Searching

### Problem

When a user scrolls down and then starts searching, the app scrolls to `top: 0` which brings the full header (logo, friends bar, tabs) into view. This pushes the first search result below the fold. The user wants to see search results immediately, starting from the first one.

### Current Layout Stack (inside `#main-scroll-container`)

```text
+----------------------------+
| Logo / QR / Notifications  |  <- sticky z-20
| Friends Stories Bar         |
| Tabs (Explore/Rooms/etc)   |
+----------------------------+
| Filter/Search Bar           |  <- sticky z-30 (overlaps header when scrolled)
+----------------------------+
| First result                |  <- THIS should be visible after search
| Second result               |
| ...                         |
+----------------------------+
```

Currently `scrollToTop()` scrolls to position 0, showing the entire header. The user wants it to scroll just past the header so the sticky filter bar sits at the top and the first result is immediately visible.

### Solution

1. Add an `id` attribute to the filter bar's sticky container in `TeamV2.tsx` so we can calculate its offset position
2. Update `scrollToTop()` in both `UnifiedFiltersBar.tsx` and `FeedFiltersBar.tsx` to scroll to the filter bar's `offsetTop` rather than to `0`

This way the header/friends/tabs scroll out of view, the filter bar sticks to the top of the viewport, and the first search result appears right below it.

### Technical Details

| File | Change |
|------|--------|
| `src/pages/TeamV2.tsx` | Add `id="sticky-filter-bar"` to the sticky filter bar container div (the `div` at line 617 with `className="sticky top-0 z-30..."`) |
| `src/components/team/UnifiedFiltersBar.tsx` | Update `scrollToTop()` to first try scrolling the filter bar element into position via its `offsetTop`, falling back to `top: 0` |
| `src/components/social/FeedFiltersBar.tsx` | Same `scrollToTop()` update for consistency |

The updated scroll logic:

```
const scrollToTop = () => {
  const container = document.getElementById('main-scroll-container');
  const filterBar = document.getElementById('sticky-filter-bar');
  if (container && filterBar) {
    container.scrollTo({ top: filterBar.offsetTop, behavior: 'smooth' });
  } else {
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
```

This scrolls the main container so the filter bar is exactly at the top edge, making the first search result immediately visible below the sticky search bar.
