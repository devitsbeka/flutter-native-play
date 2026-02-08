

## Scroll to Top When Searching

### Problem

When a user scrolls down on a tab (e.g., "ჩემი ტრივია" or "აღმოაჩინე") and then opens the search bar and types, the search results appear but the scroll position remains unchanged. The user can't see the first results because they're above the current viewport.

### Solution

When the search input opens or when the user starts typing a search query, automatically scroll the main content container to the top so results are visible from the very first item.

### What Changes

**File: `src/components/team/UnifiedFiltersBar.tsx`**

1. Add a callback prop `onSearchStart` to notify the parent when search becomes active
2. When the search button is clicked (search opens), scroll to top
3. When the user types the first character into the search field, scroll to top

The scroll target is the `#main-scroll-container` element (the `<main>` tag in `MainLayout.tsx` that wraps all page content).

### Technical Details

| File | Change |
|------|--------|
| `src/components/team/UnifiedFiltersBar.tsx` | When `setIsSearchOpen(true)` is called and when `onSearchQueryChange` fires with a non-empty value (from empty), scroll `#main-scroll-container` to top using `scrollTo({ top: 0, behavior: 'smooth' })` |

The logic:
- On search open (`setIsSearchOpen(true)`): scroll to top immediately
- No need to add new props -- the scroll behavior is self-contained inside the component since `#main-scroll-container` is always the scroll parent

This is a minimal 2-line change: add a `scrollToTop` helper function and call it when search opens and when the first character is typed.
