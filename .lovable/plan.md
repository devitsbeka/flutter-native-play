
## Fix: "Game Loading..." Screen Stuck for Non-Host Players in Room

### Root Cause

After deep investigation, the issue is in the **room re-entry flow** (`enterRoom` function in `MultiplayerContextV2.tsx`). When a player (host or non-host) re-enters a room that is already in "playing" status, the question loading at lines 850-890 has two problems:

1. **Missing `game_id` filter**: The query fetches questions without filtering by `current_game_id`, which can return stale questions from a previous game (or no questions if the old ones were deleted during `startGame`)
2. **Missing `hostIsObserver` state**: The re-entry path doesn't set `hostIsObserver`, `lastQuestionResult`, or `opponentAnswers`, causing incorrect UI rendering for hosts of their own trivia

### What the user experienced

The sequence is:
1. Host creates a room with their trivia (user_trivia_id set)
2. Gloria joins the room
3. Host clicks "Start Game"
4. `startGame` runs: deletes old questions, creates new game record, inserts new questions with game_id, updates room to "playing"
5. Between steps 4a (delete) and 4c (insert/update), the realtime event fires for any previous room update
6. Or: the non-host's question fetch timing catches the moment when old questions are deleted but new ones aren't yet committed
7. After 8 retries (4.8 seconds total), the non-host gets sent to lobby with an error -- but if the room update comes slightly out of order, they can end up in "playing" phase with empty questions = loading screen

### Technical changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

**Fix 1: Add `game_id` filter to re-entry question fetch** (lines 850-855)

Change the query to filter by `current_game_id` from the room data, with a fallback to unfiltered if no game_id exists:

```
// Before (line 851-855):
const { data: roomQuestions } = await supabase
  .from("room_questions")
  .select("*")
  .eq("room_id", room.id)
  .order("question_index", { ascending: true });

// After:
let query = supabase
  .from("room_questions")
  .select("*")
  .eq("room_id", room.id);

// Filter by current game_id if available (prevents loading stale questions)
if (room.current_game_id) {
  query = query.eq("game_id", room.current_game_id);
}

const { data: roomQuestions } = await query
  .order("question_index", { ascending: true });
```

**Fix 2: Set `hostIsObserver` and reset stale state in re-entry** (lines 875-882)

Add `hostIsObserver`, `lastQuestionResult`, and `opponentAnswers` to the re-entry setState:

```
setState(prev => ({
  ...prev,
  phase: "playing",
  currentRoom: room as GameRoom,
  questions,
  currentQuestionIndex: currentQuestion,
  myScore: existing.score || 0,
  hostIsObserver: room.host_is_observer || false,
  lastQuestionResult: null,
  opponentAnswers: {},
}));
```

**Fix 3: Add retry-with-game_id to the re-entry path** (after line 855)

If the initial query returns empty and `current_game_id` exists, retry without the filter (fallback for edge cases):

```
if ((!roomQuestions || roomQuestions.length === 0) && room.current_game_id) {
  // Retry without game_id filter as fallback
  const { data: fallbackQuestions } = await supabase
    .from("room_questions")
    .select("*")
    .eq("room_id", room.id)
    .order("question_index", { ascending: true });
  roomQuestions = fallbackQuestions;
}
```

### Why these fixes work

- **Fix 1** ensures that when a host or guest re-enters a "playing" room, they get the correct set of questions for the current game (not leftover questions from a previous round)
- **Fix 2** ensures the host correctly enters observer mode when re-entering their own trivia room, preventing them from being shown the player UI (with empty questions = loading screen)
- **Fix 3** provides a safety net: if questions exist but aren't tagged with a game_id (older games or race conditions), they're still loaded

### No changes needed elsewhere

The `startGame` and `startNewRound` functions themselves are correct -- they set all state atomically. The bug is specifically in the `enterRoom` re-entry path which was missing critical state fields and game_id filtering.
