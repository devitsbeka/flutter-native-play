# Plan: Multiplayer Round Synchronization - COMPLETED ✓

## Summary
Fixed critical synchronization bugs causing non-host players to see different questions than the host in subsequent rounds.

## Fixes Applied

### Fix 1: Clear Stale Queue on Selection ✓
**File:** `src/components/team/RoomLobbyV2.tsx`
- `handleSelectTrivia`: Now clears `room_category_queue` when host selects trivia
- `handleSelectCategory`: Now clears queue on category selection
- `handleSelectRandom`: Now clears queue on random selection

### Fix 2: Remove Stale Data Fallback ✓
**File:** `src/contexts/MultiplayerContextV2.tsx`
- Removed dangerous fallback that used "unvalidated questions" from previous games
- Non-host now returns to lobby with error message if sync fails

### Fix 3: Add game_id Filter to Question Fetch ✓
**File:** `src/contexts/MultiplayerContextV2.tsx`
- Non-host subscription handler now filters `room_questions` by `game_id`
- Only fetches questions for the CURRENT game, not leftover questions from previous games

## Expected Behavior After Fix
1. **Trivia Selection**: When host picks a trivia, queue is cleared so only that trivia plays
2. **Question Sync**: Non-host only sees questions for the current game_id
3. **Error Handling**: If sync fails, user returns to lobby with clear error message instead of seeing wrong questions
