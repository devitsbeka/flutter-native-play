
# Comprehensive Fix: TV Mode Poll to Game Flow

## Executive Summary

Multiple interconnected bugs are breaking the TV mode experience after polls. This plan addresses all identified issues systematically.

---

## Issues Identified

### Issue 1: Only Host Votes Are Being Recorded
**Root Cause:** The player `Ydydyd` has `is_active: false` in `tv_players` table, which affects how they're treated during the poll phase.

Looking at the data:
- Player `Ydydyd` has `is_active: false` and `user_id: NULL`
- The presence `leave` handler (lines 1452-1479 in TVGameContext) marks players as inactive when they leave presence
- During poll phases (`poll-suggest`, `poll-voting`, `poll-results`), which are NOT in the `activePhases` list, presence flickering marks players inactive

**Key Finding:** The `activePhases` list excludes poll phases:
```typescript
const activePhases = ['countdown', 'question', 'playing', 'reveal'];
```

This means during polls, presence flickering marks players as `is_active: false`, and they're not counted.

### Issue 2: Players Can't Answer If Host Answers First
**Root Cause:** The `active_player_count` is `1` (only the host), so when the host answers, the system thinks all players have answered.

Database shows:
- `active_player_count: 1`
- But there are 2 players in `tv_players`

The `confirmActivePlayers` function counts only `is_active: true` players, and the guest is marked inactive.

### Issue 3: Host Needs Two Clicks to Start Game
**Root Cause:** In `ControllerPollResults.tsx`, after `finalizePollAndStartGame` returns success, it just calls `onGameStart()` which logs but doesn't actually do anything meaningful. The `finalizePollAndStartGame` now sets status to `'countdown'` directly, but both the TV and host controller are potentially both triggering `startPlaying()`.

Looking at `TVCountdownScreenV2.tsx` (line 30): `if (count === 0 && !hasTriggeredPlaying.current && isHost)`
The TV display checks `isHost` but TV should never be host - it should be false.

Actually, the fix from last round set `finalizePollAndStartGame` to go directly to countdown. Let me verify if it's working...

The issue might be that **both TV and Host Controller are racing to call `startPlaying`**, or the session state update isn't propagating properly.

---

## Technical Root Cause Analysis

### The Core Problem: Poll Phases Break Player Activity Tracking

1. During poll phases, players' presence flickers (reconnects, page refreshes)
2. The `leave` handler marks them `is_active: false` because poll phases aren't in `activePhases`
3. When `finalizePollAndStartGame` calls `confirmActivePlayers`, it finds only the host is active
4. The game starts with `active_player_count: 1`
5. When host answers first, system thinks "all 1 players answered" and advances

### Secondary Issue: Guest Player's user_id is NULL

The guest player has:
- `player_id: c05d1a36-5314-495d-a1ea-71e48ca5f7cf` (which IS an auth user ID)
- `user_id: NULL`

This might affect RLS policies for votes if they check `user_id = auth.uid()`.

---

## Solution Plan

### Fix 1: Include Poll Phases in Active Phases (Prevents Premature Inactive Marking)

**File:** `src/contexts/TVGameContext.tsx` (line ~1464)

```typescript
// Before:
const activePhases = ['countdown', 'question', 'playing', 'reveal'];

// After:
const activePhases = ['countdown', 'question', 'playing', 'reveal', 'poll-suggest', 'poll-voting', 'poll-results'];
```

This ensures players don't get marked inactive during poll phases when their presence flickers.

---

### Fix 2: Reset ALL Players to Active in finalizePollAndStartGame

**File:** `src/hooks/useTVPoll.ts` (around line 515-525)

The current code already does this, but we need to add explicit `user_id` update for authenticated guests:

```typescript
// Add after the is_active reset (line 521):
// Also set user_id for any player that has auth but null user_id
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (currentUser) {
  // Update any player matching this auth user's ID as player_id but missing user_id
  await supabase
    .from('tv_players')
    .update({ user_id: currentUser.id, is_active: true })
    .eq('tv_session_id', sessionId)
    .eq('player_id', currentUser.id)
    .is('user_id', null);
}
```

---

### Fix 3: Fix confirmActivePlayers to Actually Wait for Updates

**File:** `src/contexts/TVGameContext.tsx` (confirmActivePlayers function, ~line 270-318)

The verification loop should also ensure it's actually finding the expected players. Add better logging and increase timeout:

```typescript
// After the reset (line 275-280):
// Wait longer for DB propagation after bulk reset
await new Promise(resolve => setTimeout(resolve, 300)); // Increase from 200ms
```

---

### Fix 4: Ensure startPlaying is Only Called Once After Poll

**File:** `src/components/tv/TVCountdownScreenV2.tsx`

The TV countdown checks `isHost`, but TV display should NEVER be host. Verify this is working correctly.

**File:** `src/pages/TVHostController.tsx` (lines 349-360)

The host controller also triggers `startPlaying` when countdown reaches 0. This creates a race condition where both might try to call it.

Add a mutex or check to ensure only one device triggers:

```typescript
// In TVCountdownScreenV2.tsx and TVHostController.tsx:
// Add check: if session.status is already 'playing', don't call startPlaying
```

Actually, looking at `startPlaying` (line 1820-1910 in TVGameContext), it already has:
- A mutex (`startPlayingMutexRef`)
- A check if already playing (line 1855)

So this should be working. The double-click issue might be different.

---

### Fix 5: Verify finalizePollAndStartGame Sets Correct Status

**File:** `src/hooks/useTVPoll.ts` (line 661-676)

Current code sets `status: 'countdown'` which is correct. But verify it's not failing silently.

Add better error logging:

```typescript
if (error) {
  tvLogError('[useTVPoll] Error finalizing poll', error);
  console.error('[finalizePollAndStartGame] DB update failed:', error);
  return false;
}

console.log('[finalizePollAndStartGame] ✅ Successfully set status to countdown');
```

---

### Fix 6: Fix Guest Player's user_id Registration

**File:** `src/contexts/TVGameContext.tsx` (joinSession, ~line 1097-1140)

The current code sets `user_id: authUid` (line 1098), but if `authUid` is null for some reason, it doesn't update existing records properly.

```typescript
// In the existing player update path (line 1109-1118):
if (existingPlayer) {
  await supabase
    .from('tv_players')
    .update({ 
      is_active: true,
      nickname,
      avatar_url: avatarUrl || null,
      user_id: authUserId || existingPlayer.user_id, // Preserve or set user_id
    })
    .eq('id', existingPlayer.id);
}
```

---

## Implementation Order

1. **Fix 1**: Add poll phases to `activePhases` (prevents root cause)
2. **Fix 6**: Ensure `user_id` is set for authenticated players
3. **Fix 2**: Reset players in finalizePollAndStartGame with user_id fix
4. **Fix 3**: Increase wait time in confirmActivePlayers
5. **Fix 5**: Add logging to finalizePollAndStartGame

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/TVGameContext.tsx` | Add poll phases to activePhases, fix user_id in joinSession |
| `src/hooks/useTVPoll.ts` | Add user_id update in finalizePollAndStartGame, add logging |

---

## Expected Behavior After Fix

1. **Poll phases don't break player tracking** - Players stay active during suggest/vote/results
2. **All player votes are recorded** - user_id is properly set for all authenticated players
3. **Game starts with correct player count** - confirmActivePlayers finds all active players
4. **All players can answer** - Even if host answers first, system waits for everyone
5. **Single click starts game** - finalizePollAndStartGame directly transitions to countdown

---

## Testing Verification

After implementing:
1. Start a new TV session with 2+ players
2. Complete first round normally
3. Enter poll phase (suggest categories)
4. Start voting - verify ALL players' votes appear
5. Finalize poll - verify single click starts game
6. During gameplay - verify host answering first doesn't block other players
7. Check `tv_players` table - all players should have `is_active: true` and proper `user_id`
