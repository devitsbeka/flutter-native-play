
## Fix Multiplayer User Trivia Round Transition Bug

### Problem Summary
When the host finishes Round 1 and picks a **different** user trivia ("My Trivia") for Round 2, both players see the **previous round's questions** instead of the new trivia's questions.

### Root Cause Analysis

**Bug Location:** `src/contexts/MultiplayerContextV2.tsx`

The problem is in both `startGame` (lines 825-932) and `startNewRound` (lines 1331-1424). Both functions have this flawed logic:

```text
if (!freshRoom.category_id) {  // True for user trivia
  fetch existingQuestions from room_questions
  if (existingQuestions.length > 0) {
    USE THESE EXISTING QUESTIONS  // <-- BUG: Doesn't verify they match current trivia!
  }
}
```

When the host switches from Trivia A to Trivia B:
1. `room_questions` still contains Trivia A's questions (from Round 1)
2. `handleSelectTrivia` should replace them with Trivia B's questions
3. But if `startGame` or `startNewRound` is called before the new questions are fully committed, OR if there's any timing issue, the old questions are reused
4. The code uses the NEW trivia's category name but OLD trivia's questions

**Evidence from database:**
- Room has `user_trivia_id = Business World trivia`
- But `room_questions` contains Sports trivia questions (Olympics, weightlifting, etc.)
- Match history shows duplicate identical scores because players played the same questions twice

---

### Solution Strategy

**Option 1 (Recommended): Always fetch fresh from `user_trivia_id`**

When starting a game with user trivia, ALWAYS load questions fresh from `user_quiz_posts` using `freshRoom.user_trivia_id` instead of trusting `room_questions`.

This is the most reliable approach because:
- Questions in `room_questions` may be stale from previous trivia
- `handleSelectTrivia` pre-loading is just for convenience, not a guarantee
- Fresh fetch ensures data consistency

**Option 2: Add tracking column**

Add `source_trivia_id` column to `room_questions` to verify questions match current trivia.

This is more complex and requires database migration. Option 1 is preferred.

---

### Technical Implementation

**File: `src/contexts/MultiplayerContextV2.tsx`**

#### Fix 1: Update `startGame` (lines 825-932)

Change the logic from "reuse existing questions if they exist" to "always fetch from user_trivia_id when it exists":

**Current (broken):**
```typescript
if (!freshRoom.category_id) {
  const { data: existingQuestions } = await supabase
    .from("room_questions")
    .select("*")
    .eq("room_id", roomId);
  
  if (existingQuestions && existingQuestions.length > 0) {
    // Use existing questions (BUG: may be from wrong trivia!)
  }
}
```

**Fixed:**
```typescript
if (!freshRoom.category_id && freshRoom.user_trivia_id) {
  // ALWAYS fetch fresh from user_quiz_posts to ensure correct trivia
  const { data: triviaPost } = await supabase
    .from("user_quiz_posts")
    .select("questions, title")
    .eq("id", freshRoom.user_trivia_id)
    .single();
  
  if (triviaPost?.questions) {
    // Clear old questions and insert fresh ones
    await supabase.from("room_questions").delete().eq("room_id", roomId);
    // Insert new questions with game_id...
  }
}
```

#### Fix 2: Update `startNewRound` (lines 1331-1424)

Apply the same fix - when `freshRoom.user_trivia_id` exists, always fetch fresh from `user_quiz_posts` instead of reusing `room_questions`.

#### Fix 3: Simplify `handleSelectTrivia` in `RoomLobbyV2.tsx`

Since we're now fetching fresh on game start, the lobby can just:
1. Update the room's `user_trivia_id`, `category_name`, `total_questions`
2. **NOT** pre-load questions into `room_questions` (remove the insert logic)

This removes the race condition entirely and makes the data flow cleaner.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiplayerContextV2.tsx` | Refactor `startGame` and `startNewRound` to always fetch fresh from `user_trivia_id` |
| `src/components/team/RoomLobbyV2.tsx` | Simplify `handleSelectTrivia` to only update room metadata |

---

### Expected Outcome

After these fixes:
- Round 2 will correctly load the new trivia's questions
- No stale questions from previous rounds
- Both host and guest will see the same correct questions
- Match history will show accurate, unique scores per round
- Eliminates race conditions between lobby and game start

---

### Technical Details

**Changes to `startGame` function:**

The function currently has two paths:
1. Custom trivia path (lines 825-932): Reads from `room_questions`
2. Standard category path (lines 1062-1107): Fetches from question service

The fix consolidates custom trivia loading to always use `user_trivia_id`:

1. If `!freshRoom.category_id` AND `freshRoom.user_trivia_id` exists:
   - Fetch questions directly from `user_quiz_posts` using `user_trivia_id`
   - Clear any existing `room_questions`
   - Insert fresh questions with proper `game_id`
   - Start game

2. If `!freshRoom.category_id` AND NO `user_trivia_id` (shouldn't happen normally):
   - Show error and return

**Changes to `startNewRound` function:**

Same approach - when detecting user trivia (`!freshRoom.category_id`), check for `freshRoom.user_trivia_id` and fetch fresh questions instead of reusing `room_questions`.

**Changes to `handleSelectTrivia` in lobby:**

Remove the `room_questions` insert logic:

```typescript
// Before (current):
await Promise.all(questions.map(...insert...)); // Remove this
await supabase.from("game_rooms").update({...});

// After (fixed):
// Just update room metadata - questions will be fetched on game start
await supabase.from("game_rooms").update({
  category_id: null,
  category_name: trivia.title,
  total_questions: questions.length,
  user_trivia_id: trivia.id,
}).eq("id", currentRoom.id);
```
