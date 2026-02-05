
# Plan: Fix Back Button Navigation to Return to Previous Page ✅ COMPLETED

## Problem
When users open a trivia or collection from the search panel (SpotlightSearch) and then press the back button, they are taken to the home page (Index) instead of back to the search panel. This is because the search panel is rendered as a modal overlay on the Index page, so the browser history only has `Index → TriviaLobby`.

## Solution
Implement a URL-based approach where opening the search panel adds a query parameter to the URL (`?search=open`). When users navigate to a trivia/collection from search, the back button will return them to this URL, which will automatically re-open the search panel.

## Implementation

### File 1: `src/components/search/SpotlightSearch.tsx`

**Changes:**
1. Import `useSearchParams` from `react-router-dom`
2. Sync the `open` state with URL query parameter `?search=open`
3. When opening search, add `?search=open` to the URL
4. When closing search, remove the query parameter
5. On mount, check if `?search=open` is in URL and open the panel accordingly

```tsx
// Before navigating to trivia/collection, the URL will be:
// /?search=open

// After navigating, the history will be:
// /?search=open → /trivia/123

// When user presses back:
// /?search=open (search panel auto-opens)
```

### File 2: `src/pages/Index.tsx`

**Changes:**
1. Import `useSearchParams` from `react-router-dom`
2. Check for `search=open` query parameter
3. Pass this state to SpotlightSearch to control its open state externally
4. Handle URL changes to open/close search

## Technical Details

### SpotlightSearch Changes

```text
Current Flow:
[Home Page] → Click Search Button → [Search Modal Opens]
                                    → Click Trivia → navigate('/trivia/123')
                                    
History: Index → TriviaLobby
Back Button: Goes to Index (search closed)
```

```text
New Flow:
[Home Page] → Click Search Button → [URL: /?search=open, Search Modal Opens]
                                    → Click Trivia → navigate('/trivia/123')
                                    
History: Index → Index?search=open → TriviaLobby
Back Button: Goes to Index?search=open (search re-opens automatically)
```

### Key Implementation Points

1. **URL Sync with Modal State**
   - Use `useSearchParams` hook to read/write query params
   - When `setOpen(true)` is called, also set `?search=open`
   - When `setOpen(false)` is called, remove the query param

2. **Initial State from URL**
   - On component mount, check if `search=open` exists in URL
   - If yes, set `open` state to `true`

3. **Navigation from Search**
   - Continue using regular `navigate()` for trivia/collection pages
   - The `?search=open` in history ensures back returns to search state

### Alternative Approach (Simpler but Less Robust)

Use `navigate` with `state` parameter to pass context:

```tsx
// In SpotlightSearch
const handleTriviaSelect = (triviaId: string) => {
  setOpen(false);
  navigate(`/trivia/${triviaId}`, { state: { from: 'search' } });
};

// In TriviaLobby
const handleBack = () => {
  if (location.state?.from === 'search') {
    navigate('/', { state: { openSearch: true } });
  } else {
    navigate(-1);
  }
};
```

This approach is simpler but doesn't persist across page refreshes.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/search/SpotlightSearch.tsx` | Add URL query param sync for search state |
| `src/pages/Index.tsx` | Handle `?search=open` param to control SpotlightSearch |

## Edge Cases Handled
- Direct navigation to `/?search=open` will open search panel
- Refreshing while search is open maintains the state
- Closing search clears the URL parameter
- Works on both mobile (full-screen) and desktop (dialog) modes
