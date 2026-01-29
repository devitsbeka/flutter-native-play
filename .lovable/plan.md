
# Fix Host Observer Policy for Multiplayer Games

## Problem Identified

When playing a multiplayer game with a user-created trivia ("My Trivia"), the `plays_count` is never incremented. This breaks the host-observer policy for blind trivias:

1. **Expected Behavior**: Host can play their blind trivia ONCE (first play when `plays_count = 0`). After that, `plays_count` becomes 1, and the host is forced into Observer mode on subsequent plays.

2. **Actual Behavior**: `plays_count` never increments in multiplayer, so the host can play their own trivia unlimited times.

## Root Cause

The `increment_quiz_plays` RPC is only called from `QuizPlayModal.tsx` (solo play from social feed), but it's **NOT** called from `MultiplayerContextV2.tsx` when starting a multiplayer game.

---

## Technical Solution

### File: `src/contexts/MultiplayerContextV2.tsx`

Add a call to `increment_quiz_plays` when starting a game with a `user_trivia_id`.

**Location 1** (around line 784): After successfully starting a game with existing room questions for a user trivia:

```typescript
// Increment plays_count for user trivia (enables host-observer policy after first play)
if (state.currentRoom.user_trivia_id) {
  await supabase.rpc('increment_quiz_plays', { 
    post_id: state.currentRoom.user_trivia_id 
  });
}
```

**Location 2** (around line 897): After loading questions from `user_quiz_posts` and starting the game:

```typescript
// Increment plays_count for user trivia (enables host-observer policy after first play)
await supabase.rpc('increment_quiz_plays', { 
  post_id: state.currentRoom.user_trivia_id 
});
```

**Location 3** - `startNextFromQueue`: When starting a game from the queue with a user trivia, also increment plays count.

---

## Expected Behavior After Fix

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Host plays own blind trivia (1st time) | Can play normally | Can play normally ✓ |
| Host plays own blind trivia (2nd+ time) | Can play normally (BUG) | Forced to Observer mode ✓ |
| Host plays own non-blind trivia | Forced to Observer | Forced to Observer ✓ |
| Other players play host's trivia | Can play normally | Can play normally ✓ |

---

## Observer Bonus Scoring (Already Implemented)

When in Observer mode, the host earns points based on player mistakes:
- **1-2 players**: 100 points per incorrect answer
- **3+ players**: 100 points if 50%+ of players fail

This is already working correctly in `MultiplayerObserverScreen.tsx`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiplayerContextV2.tsx` | Call `increment_quiz_plays` RPC when starting game with user trivia |

---

## Testing Steps

1. Create a new **blind** trivia (it will have `plays_count = 0`)
2. Start a multiplayer game with this trivia → Host should be able to play
3. After game finishes, check database: `plays_count` should be `1`
4. Start another game with same trivia → Host should see "შენ იცი პასუხები!" warning and be forced to Observer mode
