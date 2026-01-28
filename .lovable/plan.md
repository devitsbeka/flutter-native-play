
# Plan: Fix "Your Category" Observer Bug (Complete Fix)

## Problem Summary
The host is still being incorrectly shown as an observer ("შენი კატეგორიაა!") when selecting library categories they didn't create. The previous fix only addressed one code path.

## Root Causes Identified

### 1. `startDirectSelection` doesn't clear suggester fields
When the host clicks "კატეგორიის დამატება" (Add Category) to start direct category selection, the `startDirectSelection` function updates the session status but **does NOT clear** the `current_round_suggester_*` fields. This means stale suggester data from the previous round persists.

**Location**: `src/contexts/TVGameContext.tsx`, lines 2952-2962

**Current code** (missing suggester reset):
```text
await supabase
  .from('tv_sessions')
  .update({
    status: 'category-select',
    current_question_index: 0,
    questions: null,
    question_start_time: null,
    round_number: 1,
    total_rounds: 1,
    // MISSING: current_round_suggester_id: null,
    // MISSING: current_round_suggester_nickname: null,
    // MISSING: current_round_suggester_avatar_url: null,
  })
  .eq('id', state.sessionId);
```

### 2. Old queue items still have incorrect data
Queue items created before our poll fix still have `suggester_user_id` set for library categories. When `startNextRoundFromQueueIfAny` processes these items, it reads the incorrect data and sets it on the session.

**Evidence from database**:
```text
category_name: სერიალები (a library category)
source_type: category
suggester_user_id: 615aae02-c044-4fd0-bec0-4bd7463e7381  <-- INCORRECT!
```

## Solution

### Fix 1: Clear suggester fields in `startDirectSelection`

**File**: `src/contexts/TVGameContext.tsx`

Add the three suggester fields to the session update in `startDirectSelection`:

```text
await supabase
  .from('tv_sessions')
  .update({
    status: 'category-select',
    current_question_index: 0,
    questions: null,
    question_start_time: null,
    round_number: 1,
    total_rounds: 1,
    // CRITICAL FIX: Clear suggester fields to prevent stale data
    current_round_suggester_id: null,
    current_round_suggester_nickname: null,
    current_round_suggester_avatar_url: null,
  })
  .eq('id', state.sessionId);
```

### Fix 2: Override incorrect queue data in `startNextRoundFromQueueIfAny`

**File**: `src/contexts/TVGameContext.tsx`

In the `startNextRoundFromQueueIfAny` function, add defensive logic to IGNORE suggester data for library categories (source_type = 'category'), regardless of what's stored in the queue:

**Current code** (lines 967-970):
```typescript
const suggesterUserId = (nextItem as any).suggester_user_id as string | null;
const suggesterNickname = (nextItem as any).suggester_nickname as string | null;
const suggesterAvatarUrl = (nextItem as any).suggester_avatar_url as string | null;
```

**Fixed code**:
```typescript
// CRITICAL: Only honor suggester data for user trivias, not library categories
// This protects against stale queue items created before the poll fix
const isLibraryCategory = nextItem.category_id && !nextItem.user_trivia_id;
const suggesterUserId = isLibraryCategory ? null : (nextItem as any).suggester_user_id as string | null;
const suggesterNickname = isLibraryCategory ? null : (nextItem as any).suggester_nickname as string | null;
const suggesterAvatarUrl = isLibraryCategory ? null : (nextItem as any).suggester_avatar_url as string | null;
```

This ensures that even if the queue has incorrect data from before the fix, library categories will NEVER have a suggester.

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `src/contexts/TVGameContext.tsx` | `startDirectSelection` (lines 2952-2962) | Add `current_round_suggester_*: null` fields to session update |
| `src/contexts/TVGameContext.tsx` | `startNextRoundFromQueueIfAny` (lines 967-970) | Add defensive check to ignore suggester for library categories |

---

## Why Previous Fixes Didn't Work

1. **`startGame` fix** - Only affects the initial round. Subsequent rounds go through `startNextRoundFromQueueIfAny`.
2. **Poll fix** - Only affects NEW queue items. Old items with incorrect data still exist in the database.
3. **Missing `startDirectSelection` reset** - Host clicking "Add Category" keeps old suggester data.

This complete fix addresses ALL code paths that set suggester data.

---

## Testing Checklist
1. Host picks library category via direct selection → Host can play (not observer)
2. Host picks their own non-blind trivia → Host is observer
3. Host picks their own blind trivia → Host can play
4. Old queue items with incorrect suggester data → Host can still play library categories
5. Button texts show updated Georgian translations after page refresh
