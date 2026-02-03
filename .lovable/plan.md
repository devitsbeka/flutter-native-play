
# Plan: Fix Host Observer Mode for All Game Start Paths

## Problem Summary

The host is playing their own trivia instead of observing because:
1. Observer check logic ONLY exists in `RoomLobbyV2.tsx`'s `handleStartGame`
2. Games started from `GameResultsScreenV2.tsx` bypass this check entirely
3. `startNewRound()` and `startNextFromQueue()` never set `hostIsObserver`

## Root Cause

Multiple code paths can start a game, but only ONE path has the observer mode check:

| Start Path | File | Has Observer Check |
|-----------|------|-------------------|
| `handleStartGame` → `startGame()` | RoomLobbyV2.tsx | Yes |
| `handleSelectCategory` → `startGame()` | GameResultsScreenV2.tsx | No |
| `handleSelectTrivia` → `startGame()` | GameResultsScreenV2.tsx | No |
| `handlePlayAgain` → `startNewRound()` | GameResultsScreenV2.tsx | No |
| `handlePlayAgain` → `startNextFromQueue()` | GameResultsScreenV2.tsx | No |

## Solution: Move Observer Detection INTO the Context

Instead of requiring every caller to check and pass the observer flag, the context functions should auto-detect it.

### Change 1: Create Helper Function for Observer Detection

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add a helper function that checks if the host should observe:

```typescript
// Helper to determine if host should observe (knows answers)
const shouldHostObserve = async (
  userTriviaId: string | null,
  hostUserId: string
): Promise<boolean> => {
  if (!userTriviaId) return false; // Library/random categories: host plays
  
  const { data: trivia } = await supabase
    .from("user_quiz_posts")
    .select("user_id, is_blind, plays_count")
    .eq("id", userTriviaId)
    .maybeSingle();
  
  if (!trivia) return false;
  
  // Host knows answers if: they own it AND (it's not blind OR they've already played it)
  return trivia.user_id === hostUserId && 
    (!trivia.is_blind || (trivia.plays_count || 0) > 0);
};
```

### Change 2: Update `startGame` to Auto-Detect Observer Mode

**File**: `src/contexts/MultiplayerContextV2.tsx`

Modify `startGame` to auto-detect when no explicit flag is passed:

```typescript
const startGame = useCallback(async (hostShouldObserve?: boolean) => {
  if (!state.currentRoom || !isHost || !user) return;
  
  const roomId = state.currentRoom.id;
  
  // Fetch fresh room data
  const { data: freshRoom } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  
  if (!freshRoom) return;
  
  // Auto-detect observer mode if not explicitly provided
  const shouldObserve = hostShouldObserve ?? 
    await shouldHostObserve(freshRoom.user_trivia_id, user.id);
  
  // ... rest of function uses shouldObserve instead of hostShouldObserve
});
```

### Change 3: Update `startNewRound` to Handle Observer Mode

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add observer detection to `startNewRound`:

```typescript
const startNewRound = useCallback(async () => {
  if (!state.currentRoom || !user) return;
  
  const roomId = state.currentRoom.id;
  const { data: freshRoom } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  
  if (!freshRoom) return;
  
  // Determine if host should observe this round
  const hostShouldObserve = isHost ? 
    await shouldHostObserve(freshRoom.user_trivia_id, user.id) : false;
  
  // Update host_is_observer in database
  await supabase
    .from("game_rooms")
    .update({ host_is_observer: hostShouldObserve })
    .eq("id", roomId);
  
  // ... rest of function
  
  // When setting state, include hostIsObserver:
  setState(prev => ({
    ...prev,
    // ... existing fields
    hostIsObserver: hostShouldObserve,
    // ...
  }));
});
```

### Change 4: Update `startNextFromQueue` to Handle Observer Mode

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add observer detection to `startNextFromQueue`:

```typescript
const startNextFromQueue = useCallback(async () => {
  // ... existing queue logic
  
  // After determining the next item, check if host should observe
  const hostShouldObserve = isHost && nextItem.source_type === "user_trivia" ? 
    await shouldHostObserve(nextItem.user_trivia_id, user.id) : false;
  
  // Update host_is_observer in database
  await supabase
    .from("game_rooms")
    .update({ host_is_observer: hostShouldObserve })
    .eq("id", roomId);
  
  // ... when setting state, include hostIsObserver
});
```

### Change 5: Non-Host Must Read `host_is_observer` from Room

**File**: `src/contexts/MultiplayerContextV2.tsx`

When non-hosts detect a game starting, they must read the `host_is_observer` flag:

```typescript
// In the realtime subscription handler for room status = "playing"
if (!currentIsHost) {
  // ... existing question fetch logic
  
  // Read host_is_observer from room data
  setState(prev => ({
    ...prev,
    questions,
    // ... existing fields
    hostIsObserver: updated.host_is_observer || false, // Read from room
  }));
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiplayerContextV2.tsx` | Add `shouldHostObserve` helper, update `startGame`, `startNewRound`, `startNextFromQueue` to auto-detect and set observer mode, update non-host subscription to read `host_is_observer` |
| `src/components/team/RoomLobbyV2.tsx` | Can simplify since observer detection moves to context (optional) |

## Technical Details

- The `host_is_observer` column in `game_rooms` table already exists
- The `hostIsObserver` state in context already exists
- We just need to:
  1. Auto-detect when host should observe (based on trivia ownership)
  2. Save to database for non-hosts to read
  3. Set in local state for host
  4. Non-hosts read from database when game starts

## Expected Result After Fix

1. Host starts their own trivia from ANY screen (lobby or results)
2. Context auto-detects they own the trivia
3. `host_is_observer: true` is saved to database
4. `hostIsObserver: true` is set in host's local state
5. `MultiplayerGameScreenV2` checks `isHost && hostIsObserver` → shows observer screen
6. Guest reads `host_is_observer` from room data → knows host is observing
