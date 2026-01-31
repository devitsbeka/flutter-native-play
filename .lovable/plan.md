
# Fix Missing Trivia Played Notifications for Multiplayer Games

## Problem
When someone plays your trivia in a multiplayer room, you don't receive a notification. The notification is only sent when someone plays it solo via `QuizPlayModal`.

The code calls `increment_quiz_plays` to update the plays count in multiplayer, but never creates a notification for the trivia creator.

## Root Cause
In `MultiplayerContextV2.tsx`, there are 3 places where `increment_quiz_plays` is called for user trivia, but none of them create a notification:
- Line 888-891: When room has existing questions
- Line 1009-1012: When loading questions from user_quiz_posts
- Line 1636-1639: When starting next round with user trivia

## Solution
Add notification creation logic after each `increment_quiz_plays` call to notify the trivia creator that their trivia was played.

---

## Files to Modify

### 1. `src/contexts/MultiplayerContextV2.tsx`

**Add import at top:**
```typescript
import { createNotification } from "@/hooks/useNotifications";
```

**Create helper function to notify trivia creator:**
```typescript
// Helper to notify trivia creator when their trivia is played in multiplayer
const notifyTriviaCreator = async (userTriviaId: string, playerId: string) => {
  try {
    // Get trivia details
    const { data: triviaPost } = await supabase
      .from("user_quiz_posts")
      .select("user_id, title")
      .eq("id", userTriviaId)
      .single();
    
    // Don't notify if creator is the one playing
    if (!triviaPost || triviaPost.user_id === playerId) return;
    
    // Get player profile
    const { data: playerProfile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("user_id", playerId)
      .single();
    
    await createNotification(
      triviaPost.user_id,
      "trivia_played",
      `${playerProfile?.nickname || "ვიღაცამ"} ითამაშა შენი ტრივია`,
      triviaPost.title || undefined,
      { post_id: userTriviaId, player_id: playerId }
    );
  } catch (error) {
    console.error("Error notifying trivia creator:", error);
  }
};
```

**Update 3 locations to call helper after increment_quiz_plays:**

**Location 1** (lines 888-892):
```typescript
if (freshRoom.user_trivia_id) {
  await supabase.rpc('increment_quiz_plays', { 
    post_id: freshRoom.user_trivia_id 
  });
  // Notify trivia creator - use first participant who is not host
  const { data: participants } = await supabase
    .from("room_participants")
    .select("user_id")
    .eq("room_id", roomId)
    .neq("user_id", freshRoom.host_id)
    .limit(1);
  if (participants?.[0]?.user_id) {
    await notifyTriviaCreator(freshRoom.user_trivia_id, participants[0].user_id);
  }
}
```

**Location 2** (lines 1009-1012): Same pattern

**Location 3** (lines 1636-1639): Same pattern

---

## Alternative: Database Trigger Approach

For more reliable instant notifications, we could create a database trigger on the `quiz_post_plays` table that automatically creates notifications when a play is recorded. This is the pattern already used for friend requests.

Benefits:
- Single source of truth
- Cannot be missed by any code path
- Works even if frontend code fails

This would require a database migration to create the trigger function.

---

## Visual Result

| Before | After |
|--------|-------|
| No notification when trivia played in multiplayer | Notification sent to creator |
| Only solo play triggers notification | All play types trigger notification |

---

## Technical Details

| Change | Location | Details |
|--------|----------|---------|
| Import createNotification | MultiplayerContextV2.tsx | Top of file |
| Helper function | MultiplayerContextV2.tsx | notifyTriviaCreator() |
| Call after increment_quiz_plays | 3 locations | Lines 888, 1009, 1636 |

---

## Note on Instant Delivery

The notification system already supports instant delivery:
- `notifications` table is in the realtime publication
- `useNotifications` hook subscribes to `postgres_changes` for INSERT events
- When a notification is inserted, it appears instantly and plays a sound

The issue is simply that notifications are not being **created** for multiplayer trivia plays.
