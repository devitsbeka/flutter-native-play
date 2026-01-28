
# Plan: Fix Observer Bug for Library Categories in Poll Mode

## Problem Summary

When a library category is selected through poll mode, the host is incorrectly shown as an "observer" and cannot play. The screenshot shows "შენი კატეგორიაა!" (Your category!) even though the category "საქართველოს ისტორია" (Georgian History) is a **library category**, not the user's own trivia.

## Root Cause

In `useTVPoll.ts`, when finalizing a poll, the session update incorrectly sets the suggester as the **player who suggested the category** rather than following the rule that:
- Library categories = NO observer (anyone can play)
- User trivias (non-blind) = trivia owner is observer

**Current buggy code (lines 844-849):**
```typescript
category_name: firstSuggestion.category_name,
category_icon: firstSuggestion.icon_slug || null,
// CRITICAL FIX: Set suggester fields so only they see Observer UI
current_round_suggester_id: firstSuggestion.user_id || null,  // BUG!
current_round_suggester_nickname: firstSuggestion.nickname || null,
current_round_suggester_avatar_url: firstSuggestion.avatar_url || null,
```

The code uses `firstSuggestion.user_id` (the player who suggested it) but should use the same logic as the queue insertion:
- For `source_type === 'category'`: No suggester (null)
- For `source_type === 'trivia'` with `!is_blind`: Trivia owner is suggester

## Solution

Update the `finalizePollAndStartGame` function to determine the suggester based on source type, matching the logic already used for queue items.

### File: `src/hooks/useTVPoll.ts`

**Before (lines 827-850):**
The session update blindly uses `firstSuggestion.user_id` for all source types.

**After:**
Add logic to check source type and only set suggester for non-blind user trivias:

```typescript
// CRITICAL FIX: Determine suggester based on source type
// - Library categories: NO suggester (anyone can play)
// - User trivias (non-blind): Trivia OWNER is suggester (not the person who suggested it)
let suggesterUserId: string | null = null;
let suggesterNickname: string | null = null;
let suggesterAvatarUrl: string | null = null;

// Only set suggester for non-blind user trivias
if (firstSuggestion.source_type === 'trivia' && firstSuggestion.user_trivia_id) {
  // Get the trivia owner info (already fetched in triviaOwnerMap)
  const triviaInfo = triviaOwnerMap[firstSuggestion.user_trivia_id];
  if (triviaInfo && !triviaInfo.is_blind) {
    suggesterUserId = triviaInfo.user_id;
    suggesterNickname = triviaInfo.owner_nickname;
    suggesterAvatarUrl = triviaInfo.owner_avatar;
  }
}
// For library categories (source_type === 'category'), suggester stays null

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
    category_name: firstSuggestion.category_name,
    category_icon: firstSuggestion.icon_slug || null,
    // Use the correctly determined suggester (null for library categories)
    current_round_suggester_id: suggesterUserId,
    current_round_suggester_nickname: suggesterNickname,
    current_round_suggester_avatar_url: suggesterAvatarUrl,
  })
  .eq('id', sessionId);
```

### Technical Details

The `triviaOwnerMap` is already being built earlier in the function (lines 655-692) and contains the trivia owner information including `is_blind` flag. We just need to reuse this same map to determine the session-level suggester.

---

## Summary of Changes

| Location | Change |
|----------|--------|
| `src/hooks/useTVPoll.ts` lines 827-850 | Add source type check before setting suggester fields in session update |

---

## Why Previous Fix Didn't Work

The previous fix in `startNextRoundFromQueueIfAny` correctly ignores suggester data for library categories when processing **queue items**. However, the **first round** goes through `finalizePollAndStartGame` which directly updates the session with incorrect suggester data. The queue item is correct, but the session itself has wrong data.

---

## Testing Checklist
1. Start poll mode and suggest library categories
2. Finalize poll - host should be able to answer questions
3. Start poll mode and suggest a user trivia (non-blind)
4. Finalize poll - trivia owner should be observer
5. Start poll mode and suggest a blind trivia
6. Finalize poll - no one should be observer (blind trivias have no known answers)
