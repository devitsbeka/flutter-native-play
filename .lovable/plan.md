
## Fix: Filter Dropdown Gets Stuck When Switching Tabs

### Problem
When a user opens the filter/sort dropdown on one tab (e.g., "ოთახები") and then switches to another tab (e.g., "ჩემი ტრივია"), the dropdown remains visually stuck on screen. This happens because the `DropdownMenu` uses `modal={false}`, which means Radix doesn't automatically close it when focus leaves. When the tab switches, the old `UnifiedFiltersBar` unmounts but the dropdown portal may not clean up properly.

### Fix

**File: `src/pages/TeamV2.tsx`** -- Add a unique `key` prop to each `UnifiedFiltersBar` instance

Adding `key={activeTab}` to the sticky filter bar container forces React to fully unmount and remount the filter bar (including any open dropdown portals) whenever the active tab changes.

Change the wrapper div (line 694):
```
Before:
<div id="sticky-filter-bar" className="sticky top-0 z-30 ...">

After:
<div key={activeTab} id="sticky-filter-bar" className="sticky top-0 z-30 ...">
```

This is a one-line, single-attribute change. When the tab switches, React will destroy the old filter bar DOM tree (including any open Radix dropdown portals) and create a fresh one, preventing the stuck dropdown.
