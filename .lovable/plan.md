

# Plan: Fix Game Start Blocked by Missing RLS DELETE Policy

## Problem Summary

When clicking "Start Game", the button shows "ინწყება..." (Starting...) but the game never starts. The `safeDeleteRoomQuestions` function fails silently because the `room_questions` table is missing a DELETE policy, causing the verification loop to fail after 3 retries.

## Root Cause

The `room_questions` table has RLS policies for:
- **SELECT**: Participants can view room questions
- **INSERT**: Host can insert room questions

**BUT NO DELETE POLICY EXISTS!**

When `safeDeleteRoomQuestions` runs:
```typescript
await supabase.from("room_questions").delete().eq("room_id", roomId);
```

The delete silently fails due to RLS. The verification loop then detects 5 questions still exist, retries 3 times, and returns `false`. The game start aborts with a toast error.

## Database Evidence

```text
room_questions table still has 5 questions:
- game_id: 3c9407ce... (OLD game from previous round)
- question_index: 0-4
```

Current RLS policies from query:
```
cmd: INSERT  -> "Host can insert room questions"
cmd: SELECT  -> "Participants can view room questions"
(NO DELETE policy exists!)
```

---

## Solution: Add Missing DELETE Policy

### Migration SQL

```sql
-- Add DELETE policy for room_questions
-- Allows the room host to delete questions from their room
CREATE POLICY "Host can delete room questions" 
ON public.room_questions
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr 
    WHERE gr.id = room_questions.room_id 
    AND gr.host_user_id = auth.uid()
  )
);
```

---

## Secondary Issue: Reset `host_is_observer` on Library Category Switch

When switching from a user trivia (where host was observer) to a library category (where host should play normally), the `host_is_observer` flag is not being reset.

Current database state shows:
```text
category_id: b352d1cf... (გეოგრაფია - library category)
host_is_observer: true  <- STALE! Should be false for library categories
```

### Fix Location: `startGame` function

Add a reset of `host_is_observer` to `false` when starting a library category game:

```typescript
// In startGame, when hostShouldObserve is false (default for library categories):
if (!hostShouldObserve) {
  await supabase
    .from("game_rooms")
    .update({ host_is_observer: false })  // Reset stale observer flag
    .eq("id", roomId);
}
```

---

## Files to Modify

| Type | Path | Change |
|------|------|--------|
| Migration | `supabase/migrations/...` | Add DELETE policy for room_questions |
| Code | `src/contexts/MultiplayerContextV2.tsx` | Reset host_is_observer to false when starting non-observer game |

---

## Expected Behavior After Fix

1. Host clicks "Start Game" for library category
2. `safeDeleteRoomQuestions` successfully deletes old questions (DELETE policy works)
3. New questions are inserted for the new game
4. `host_is_observer` is reset to `false`
5. Room status updates to "playing"
6. Both host and guest transition to game screen

---

## Testing Checklist

- Verify DELETE policy is applied successfully
- Test starting a game after returning from previous round
- Test switching from user trivia (observer mode) to library category
- Confirm host can play normally after switching to library category
- Confirm non-host receives questions and transitions correctly

