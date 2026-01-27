

# Fix: Poll "დაწყება" Button Stuck in "იწყება..."

## Problem

After clicking "დაწყება" (Start), the button shows "იწყება..." (Starting...) but nothing happens. The game never starts.

### Root Cause

The `finalizePollAndStartGame` function in `src/hooks/useTVPoll.ts` (lines 767-785) tries to update the `tv_sessions` table with columns that **do not exist**:

```typescript
// Line 777-779 - FAILING CODE
category_id: firstSuggestion.category_id,      // ❌ Column doesn't exist!
category_name: firstSuggestion.category_name,  // ✅ Exists
user_trivia_id: firstSuggestion.user_trivia_id, // ❌ Column doesn't exist!
```

**Database Error (from network logs):**
```json
{
  "code": "PGRST204",
  "message": "Could not find the 'category_id' column of 'tv_sessions' in the schema cache"
}
```

### Actual tv_sessions Columns

| Column | Exists |
|--------|--------|
| `category_name` | Yes |
| `category_icon` | Yes |
| `category_id` | **No** |
| `user_trivia_id` | **No** |

---

## Solution

Remove the non-existent columns from the update query and only use fields that exist in the database schema.

---

## Implementation

### File: `src/hooks/useTVPoll.ts`

**Change: Update session with only valid columns**

Replace lines 767-785:

**Before:**
```typescript
const { error } = await supabase
  .from('tv_sessions')
  .update({
    status: 'countdown',
    current_question_index: 0,
    questions: questions,
    round_number: 1,
    total_rounds: topN,
    poll_start_time: null,
    active_player_count: expectedCount,
    category_id: firstSuggestion.category_id,           // ❌ REMOVE
    category_name: firstSuggestion.category_name,
    user_trivia_id: firstSuggestion.user_trivia_id,    // ❌ REMOVE
    current_round_suggester_id: firstSuggestion.user_id || null,
    current_round_suggester_nickname: firstSuggestion.nickname || null,
    current_round_suggester_avatar_url: firstSuggestion.avatar_url || null,
  })
  .eq('id', sessionId);
```

**After:**
```typescript
const { error } = await supabase
  .from('tv_sessions')
  .update({
    status: 'countdown',
    current_question_index: 0,
    questions: questions,
    round_number: 1,
    total_rounds: topN,
    poll_start_time: null,
    active_player_count: expectedCount,
    category_name: firstSuggestion.category_name,       // ✅ Keep
    category_icon: firstSuggestion.icon_slug || null,   // ✅ Add (column exists)
    current_round_suggester_id: firstSuggestion.user_id || null,
    current_round_suggester_nickname: firstSuggestion.nickname || null,
    current_round_suggester_avatar_url: firstSuggestion.avatar_url || null,
  })
  .eq('id', sessionId);
```

---

## Technical Details

### Why This Happens

The poll suggestions table stores both `category_id` (slug) and `user_trivia_id`, but the `tv_sessions` table was never designed to store these fields - it only stores the `category_name` and `category_icon` for display purposes.

### What Gets Fixed

| Before | After |
|--------|-------|
| PATCH fails with 400 error | PATCH succeeds |
| `isStarting` stays `true` forever | `isStarting` becomes `false` after success |
| Game never transitions | Game transitions to countdown phase |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useTVPoll.ts` | Remove `category_id` and `user_trivia_id` from update, add `category_icon` |

