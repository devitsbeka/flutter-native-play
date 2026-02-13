

## Fix: Mixed Category Slow/Stuck Game Start

### Root Cause

When the mixed category ("სხვადასხვა") is selected, the question service calls `getMultiCategoryVSQuestions` which loops through every category and makes a **separate database query for each one** (lines 731-760 of `questionService.ts`). With 10+ categories, this means 10+ sequential network requests, causing:

1. **Pre-fetch during VS animation rarely completes** -- the "category-found" to "ready" transition is only 400ms, far too short for 10+ sequential queries
2. **Clicking "Start" triggers a second full fetch** -- since pre-fetch isn't done, `beginPlaying` falls through to a fresh fetch, doubling the wait
3. **No loading feedback** -- the Start button appears enabled immediately but does nothing visible while questions load in the background
4. **Multiple clicks queue up multiple fetches** -- no guard against re-clicking while a fetch is in progress

### Solution

**1. Replace sequential queries with a single bulk query** (`src/services/questionService.ts`)

Instead of querying each category separately in a loop, fetch all questions across all categories in ONE query, then distribute/shuffle them. This turns 10+ network requests into 1.

```text
Before: for each category -> query DB -> pick 1 question (10+ queries)
After:  query ALL categories at once -> shuffle -> pick N questions (1 query)
```

**2. Track pre-fetch readiness in VSScreen** (`src/components/game/VSScreen.tsx`)

- Add a `prefetchReady` state that tracks when pre-fetched questions are available
- Delay showing the Start button (or show it as loading) until pre-fetch completes
- Prevent the Start button from being clickable until questions are actually loaded

**3. Prevent double-fetch in beginPlaying** (`src/contexts/GameContext.tsx`)

- Add an `isStarting` guard ref to prevent multiple clicks from triggering parallel fetches
- Only fall through to a fresh fetch if pre-loaded questions are truly unavailable

### Technical Details

**File: `src/services/questionService.ts`** -- Rewrite `getMultiCategoryVSQuestions`

Replace the per-category loop (lines 724-760) with a single query:
- Query all active+production questions in the user's language, excluding seen IDs, with a reasonable limit (e.g., 200)
- Shuffle results and pick `count` questions, preferring diversity across categories
- This reduces 10+ sequential queries to just 1-2

**File: `src/components/game/VSScreen.tsx`** -- Pre-fetch tracking

- Add `prefetchReady` boolean state, set to `true` when pre-fetch `.then()` resolves
- Change the Start button: disable it and show a spinner/loading text until `prefetchReady` is true
- This gives visual feedback and prevents "nothing happens" clicks

**File: `src/contexts/GameContext.tsx`** -- Double-click guard

- Add an `isStartingRef` to prevent `beginPlaying` from being called multiple times concurrently
- Set it on entry, clear it on success or error

### Files to Edit
- `src/services/questionService.ts` -- rewrite multi-category query to use single bulk fetch
- `src/components/game/VSScreen.tsx` -- add pre-fetch readiness state and button loading
- `src/contexts/GameContext.tsx` -- add concurrent-call guard to `beginPlaying`

