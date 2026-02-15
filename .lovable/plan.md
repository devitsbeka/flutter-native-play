

## Fix: "სხვადასხვა" (Mixed) Category Not Starting in VS Game

### Problem
When the slot machine lands on "სხვადასხვა" (Mixed), the game never starts. The Start button either stays disabled or the game shows an error and returns to home.

### Root Cause
The Mixed category fetches questions from ALL categories using `getMultiCategoryVSQuestions`. This function excludes previously-seen questions using a NOT IN filter with up to **5,000 UUIDs** (each 36 characters long). The resulting query parameter is ~180KB, which exceeds Supabase URL length limits. The query silently fails and returns 0 questions.

Other categories work fine because they use `getCategoryQuestions`, which tracks only ~500 IDs per category.

### Fix

**File: `src/services/questionService.ts`** -- `getMultiCategoryVSQuestions` function (around line 706)

1. **Cap the exclude list** before building the query. Limit to the **200 most recent** seen IDs instead of all 5,000. This keeps the query well under URL limits while still providing variety.
2. If the capped query still returns fewer than needed, **retry without any exclusions** as a fallback (already partially handled, but needs to be more robust).

```text
Before (line ~706):
  let excludeIds = wasReset ? [] : [...seenIds];

After:
  // Cap excludeIds to prevent oversized query URLs (5000 UUIDs = ~180KB, exceeds limits)
  const MAX_EXCLUDE_IN_QUERY = 200;
  let excludeIds = wasReset ? [] : seenIds.slice(-MAX_EXCLUDE_IN_QUERY);
```

3. Apply the same fix to `getSingleCategoryVSQuestions` (line ~602-613) for consistency, since it also uses `getSeenQuestionIds()`:

```text
Before (line ~582):
  let excludeIds = [...seenIds];

After:
  const MAX_EXCLUDE_IN_QUERY = 200;
  let excludeIds = seenIds.slice(-MAX_EXCLUDE_IN_QUERY);
```

### Impact
- Fixes the "never starts" bug for სხვადასხვა category
- Minor trade-off: users may see a recently-seen question sooner (from the excluded 4800), but since we still exclude the 200 most recent, short-term variety is maintained
- No database changes needed
- Single file change

