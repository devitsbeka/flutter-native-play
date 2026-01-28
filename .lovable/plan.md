
# Plan: Fix Button Texts and "Your Category" Bug

## Summary
This plan addresses two issues:
1. **Button text changes**: Update "კატეგორიის არჩევა" to "კატეგორიის დამატება" and "ხმის მიცემა" to "არჩევნების დაწყება"
2. **Bug fix**: The host incorrectly sees "შენი კატეგორიაა!" (Your category - skip round) when selecting library categories instead of their own trivias

---

## Issue 1: Button Text Changes

### Analysis
The buttons appear on the game-over screen (`TVGameOverScreen.tsx`) at lines 254 and 264. These buttons allow the host to start a new round by either:
- Directly selecting a category ("კატეგორიის არჩევა" → "კატეგორიის დამატება")
- Starting a poll vote ("ხმის მიცემა" → "არჩევნების დაწყება")

### Changes
**File: `src/components/tv/TVGameOverScreen.tsx`**
- Line 254: Change "კატეგორიის არჩევა" to "კატეგორიის დამატება"
- Line 264: Change "ხმის მიცემა" to "არჩევნების დაწყება"

---

## Issue 2: "Your Category" Bug

### Root Cause Analysis
The system incorrectly shows the observer UI ("შენი კატეგორიაა!") when the host selects a library category because:

1. **Stale `current_round_suggester_id`**: When the host starts a new game via the `startGame()` function (in `TVGameContext.tsx`), the session update does NOT include `current_round_suggester_id: null` to clear any previous value.

2. **Flow breakdown**:
   - Round 1: User plays their own trivia → `current_round_suggester_id` = user's ID
   - Round 2: User picks a library category → `startGame()` runs but doesn't clear the suggester fields
   - Result: The session still has `current_round_suggester_id` = user's ID, so they see the observer UI

3. **Verification**: The check `isSuggester = myPlayerId && currentRoundSuggesterId && myPlayerId === currentRoundSuggesterId` evaluates to `true` because the old ID persists.

### Fix Strategy
Explicitly clear the suggester fields when starting a new game in the `startGame()` function. This ensures that:
- Library categories: No suggester (host can play)
- User's own non-blind trivias: Should have suggester set (host observes)
- User's own blind trivias: No suggester (host can play - they don't know answers)

### Changes
**File: `src/contexts/TVGameContext.tsx`**

In the `startGame` function, update the session to explicitly clear/set suggester fields based on the trivia type:

```text
Lines 2381-2394: Add suggester field handling to the session update
```

**Logic**:
- If starting with a standard category (`categoryId`): Set all suggester fields to `null`
- If starting with a user trivia (`userTriviaId`): Need to fetch `is_blind` and `user_id` from the trivia, and:
  - If the trivia owner matches the current user AND `is_blind = false`: Set suggester = current user
  - Otherwise: Set suggester = `null`

However, since `startGame` is called without user context readily available, and the `startNextRoundFromQueueIfAny` function already handles this correctly via queue items, the simplest fix is:

**Simpler Fix**: Always clear suggester fields in `startGame()` since:
- Library categories have no suggester
- For user trivias called via `handleStartGame` in `TVHostController`, if the host's own trivia was selected from queue, the queue item should have `suggester_user_id` populated (this happens in the poll flow but NOT in direct selection)

**Complete Fix requires two parts**:

### Part A: Clear suggester in `startGame()` for library categories
In the session update at lines 2382-2394, add:
```typescript
current_round_suggester_id: null,
current_round_suggester_nickname: null,
current_round_suggester_avatar_url: null,
```

This ensures any new game started via `startGame()` clears stale suggester data.

### Part B: Populate suggester in direct selection for user's own non-blind trivias
In `ControllerDirectSelection.tsx` lines 156-163, when adding a user trivia to the queue, also fetch the user info and set:
- `suggester_user_id: userId` (if the trivia is NOT blind)
- `suggester_nickname`, `suggester_avatar_url`

This requires fetching the current user's profile info or using the already-available `userId` prop.

---

## Technical Implementation Details

### File: `src/contexts/TVGameContext.tsx`

**Change 1**: In `startGame` function (around line 2382-2394)

Add the following fields to the session update to explicitly clear suggester info:

```typescript
await supabase
  .from('tv_sessions')
  .update({
    status: 'countdown',
    questions: formattedQuestions as unknown as Json,
    current_question_index: 0,
    category_name: categoryName,
    category_icon: categoryIcon,
    round_number: 1,
    total_rounds: totalRoundsCount,
    active_player_count: playerCount,
    // CRITICAL FIX: Clear suggester fields to prevent stale IDs from blocking host
    current_round_suggester_id: null,
    current_round_suggester_nickname: null,
    current_round_suggester_avatar_url: null,
  })
  .eq('id', state.sessionId);
```

### File: `src/components/controller/ControllerDirectSelection.tsx`

**Change 2**: In `handleSelectTrivia` function (around lines 156-163)

When inserting a user trivia into the queue, add suggester info if the trivia is NOT blind:

```typescript
// Fetch user profile for suggester info
const { data: profile } = await supabase
  .from('profiles')
  .select('nickname, avatar_url')
  .eq('id', userId)
  .maybeSingle();

// Insert with suggester info if not a blind trivia
const { error } = await supabase.from('tv_session_queue').insert({
  session_id: sessionId,
  position: nextPosition,
  source_type: 'user_trivia',
  user_trivia_id: trivia.id,
  category_name: trivia.title,
  icon_slug: trivia.icon_slug,
  // Only set suggester if this is NOT a blind trivia
  suggester_user_id: trivia.is_blind ? null : userId,
  suggester_nickname: trivia.is_blind ? null : profile?.nickname,
  suggester_avatar_url: trivia.is_blind ? null : profile?.avatar_url,
});
```

### File: `src/components/tv/TVGameOverScreen.tsx`

**Change 3**: Update button texts (lines 254 and 264)
- "კატეგორიის არჩევა" → "კატეგორიის დამატება"
- "ხმის მიცემა" → "არჩევნების დაწყება"

---

## Summary of Files to Modify

| File | Change |
|------|--------|
| `src/components/tv/TVGameOverScreen.tsx` | Update two button text strings |
| `src/contexts/TVGameContext.tsx` | Clear suggester fields in `startGame()` session update |
| `src/components/controller/ControllerDirectSelection.tsx` | Add suggester info when inserting user's own non-blind trivias |

---

## Testing Checklist
1. After finishing a round of the host's own non-blind trivia, selecting a library category should let the host play (not observe)
2. Selecting the host's own blind trivia should let the host play
3. Selecting the host's own non-blind trivia should show the observer UI
4. Button texts should show the new Georgian translations
