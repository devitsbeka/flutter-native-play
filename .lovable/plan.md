

# Fix Old Room Entry & Complete Search Navigation

## Problem Summary

When entering an old room (inactive for 1+ hour) that was left in "playing" status, the app incorrectly loads the game screen with timer. User wants to see the room lobby with game history instead.

---

## Implementation Plan

### 1. Add Room Staleness Check in `enterRoom` Function

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add a helper function to check if a room is stale (inactive for more than 1 hour) and modify the `enterRoom` function to:

1. Check if room's `last_activity_at` is older than 1 hour
2. If stale AND room is in "playing" status:
   - Reset room status to "waiting" 
   - Clear stale game data (reset `current_game_id`)
   - Send user to lobby phase instead of playing phase
3. This ensures old rooms show the lobby with game history

```text
Before (lines ~797-803):
- If room.status === "playing" → go to playing phase

After:
- Check if room is stale (last_activity_at > 1 hour ago)
- If stale AND room.status === "playing":
  → Reset room status to "waiting"
  → Clear player scores/progress for fresh start
  → Go to lobby phase
- If NOT stale AND room.status === "playing":
  → Keep existing behavior (resume game)
```

### 2. Create Room Staleness Helper

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add a helper function near the top of the file:

```typescript
// Check if a room is stale (inactive for more than 1 hour)
const isRoomStale = (lastActivityAt: string | null, createdAt: string): boolean => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour in ms
  const activityTime = new Date(lastActivityAt || createdAt).getTime();
  return activityTime < oneHourAgo;
};
```

### 3. Modify `enterRoom` Logic

**File**: `src/contexts/MultiplayerContextV2.tsx` (around lines 797-853)

Update the phase determination logic:

```typescript
// Check if room is stale (1+ hour of inactivity)
const stale = isRoomStale(room.last_activity_at, room.created_at);

// If room is stale and in playing/completed state, reset to lobby
if (stale && (room.status === "playing" || room.status === "completed")) {
  console.log(`[MP] Room ${room.room_code} is stale, resetting to lobby`);
  
  // Reset room to waiting state
  await supabase
    .from("game_rooms")
    .update({ 
      status: "waiting", 
      current_game_id: null,
      last_activity_at: new Date().toISOString() 
    })
    .eq("id", room.id);
    
  // Reset participant progress for new round
  await supabase
    .from("room_participants")
    .update({ 
      current_question: 0, 
      score: 0, 
      has_seen_results: false,
      status: "joined" 
    })
    .eq("room_id", room.id);
  
  // Go to lobby
  setState(prev => ({
    ...prev,
    phase: "lobby",
    currentRoom: { ...room, status: "waiting", current_game_id: null } as GameRoom,
  }));
  
  return true; // Early return after handling stale room
}

// ... rest of existing logic for non-stale rooms
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Add `isRoomStale` helper function (1 hour threshold) |
| `src/contexts/MultiplayerContextV2.tsx` | Modify `enterRoom` to check for stale rooms and reset them to lobby |

---

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Enter room inactive <1 hour in "playing" status | Resumes game | Resumes game (no change) |
| Enter room inactive >1 hour in "playing" status | Shows game with timer | Shows lobby with game history |
| Enter room inactive >1 hour in "completed" status | Shows results | Shows lobby (fresh start) |
| Enter room in "waiting" status | Shows lobby | Shows lobby (no change) |

---

## Note on Search Navigation

After reviewing the code, the search navigation is already correctly implemented:

- **Friends** → `/profile/{friendId}` (opens profile page) ✓
- **Rooms** → `/room/{code}` → redirects to `/team?join={code}` (opens room lobby) ✓
- **Trivias** → `/trivia/{id}` (opens TriviaLobby with play/leaderboard) ✓
- **Collections** → `/collection/{id}` (opens CollectionLobby with rounds) ✓

All click handlers are wired correctly in `SpotlightSearch.tsx` and `SearchHorizontalLists.tsx`. The issue you're experiencing with rooms is specifically the stale room entering game mode, which will be fixed by the above changes.

