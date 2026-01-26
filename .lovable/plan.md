
# Comprehensive Fix: Post-Poll Game Flow Breakdown

## Root Cause Analysis

After deep investigation of the code, database state, and console logs, I've identified the **critical root cause** of why players can't answer questions after polls and questions advance automatically:

### The Bug: Missing `current_round_suggester_id` in `finalizePollAndStartGame`

**Evidence from Database:**
```
tv_sessions:
- status: 'playing' (or 'completed')
- active_player_count: 2
- current_round_suggester_id: b15c0d28... (the host)
```

**Evidence from Code:**
Looking at `src/hooks/useTVPoll.ts` lines 685-699, the `finalizePollAndStartGame` function updates the session but **does NOT set the suggester fields**:

```typescript
const { error } = await supabase
  .from('tv_sessions')
  .update({
    status: 'countdown',
    current_question_index: 0,
    questions: questions,
    // ... other fields ...
    active_player_count: expectedCount,
    category_id: firstSuggestion.category_id,
    category_name: firstSuggestion.category_name,
    user_trivia_id: firstSuggestion.user_trivia_id,
    // MISSING: current_round_suggester_id ❌
    // MISSING: current_round_suggester_nickname ❌
    // MISSING: current_round_suggester_avatar_url ❌
  })
```

### The Chain Reaction

1. **Poll Finishes**: Host's category wins → `finalizePollAndStartGame` is called
2. **Suggester Info NOT Set**: The session update doesn't include `current_round_suggester_id`
3. **Stale Suggester ID Persists**: From a PREVIOUS round, the `current_round_suggester_id` is still the host's ID
4. **Host Blocked from Answering**: `ControllerQuestion.tsx` checks `isSuggester = myPlayerId === currentRoundSuggesterId` → TRUE for host (due to stale data)
5. **Guest Also Blocked**: Looking at the logs, the guest player `user_id` is NULL, meaning they can't properly authenticate their answers
6. **Timer Advances**: Since no one can answer, the timer runs out (15 seconds) and advances to reveal
7. **Repeat**: This pattern continues for all questions

### Secondary Issue: Guest Player's `user_id` is NULL

Database shows:
```
tv_players:
- TriviaMaste (host): user_id = b15c0d28... ✓
- Hfyfu (guest): user_id = NULL ❌
```

This breaks RLS policies and prevents the guest from submitting answers properly.

---

## The Complete Fix

### Fix 1: Set Suggester ID in `finalizePollAndStartGame`

**File:** `src/hooks/useTVPoll.ts` (lines 685-699)

Add the missing suggester fields to the session update:

```typescript
const { error } = await supabase
  .from('tv_sessions')
  .update({
    status: 'countdown',
    current_question_index: 0,
    questions: questions,
    round_number: 1,
    total_rounds: topN,
    poll_start_time: null,
    active_player_count: expectedCount,
    category_id: firstSuggestion.category_id,
    category_name: firstSuggestion.category_name,
    user_trivia_id: firstSuggestion.user_trivia_id,
    // ADD THESE THREE LINES:
    current_round_suggester_id: firstSuggestion.user_id,
    current_round_suggester_nickname: firstSuggestion.nickname,
    current_round_suggester_avatar_url: firstSuggestion.avatar_url,
  })
  .eq('id', sessionId);
```

### Fix 2: Adjust `active_player_count` for Suggester

Currently `finalizePollAndStartGame` sets `active_player_count: expectedCount` but doesn't adjust for the suggester who won't answer.

Add adjustment logic after verifying the player count:

```typescript
// After livePlayerCount verification loop (around line 577):
let finalExpectedCount = Math.max(livePlayerCount, 2);

// CRITICAL: Adjust for suggester skip rule
// The suggester won't answer, so reduce expected count by 1
if (firstSuggestion.user_id) {
  finalExpectedCount = Math.max(1, finalExpectedCount - 1);
  console.log('[finalizePollAndStartGame] 👤 Adjusted for suggester:', { 
    original: livePlayerCount, 
    adjusted: finalExpectedCount 
  });
}
```

Then use `finalExpectedCount` instead of `expectedCount` in the session update.

### Fix 3: Clear Stale Suggester on Poll Start

When a poll starts (between rounds), we should clear the suggester from the previous round to prevent stale data issues.

**File:** `src/hooks/useTVPoll.ts` - In `initiatePoll` function

Add clearing of suggester fields:

```typescript
// When initiating poll, clear previous suggester
await supabase
  .from('tv_sessions')
  .update({ 
    status: 'poll-suggest',
    current_round_suggester_id: null,
    current_round_suggester_nickname: null,
    current_round_suggester_avatar_url: null,
  })
  .eq('id', sessionId);
```

### Fix 4: Robust Guest `user_id` Sync

The current sync logic in `finalizePollAndStartGame` only runs for players with NULL `user_id`. But the issue is deeper - the guest's `player_id` IS their auth user ID, but `user_id` wasn't set during registration.

Enhance the sync to be more aggressive:

**File:** `src/hooks/useTVPoll.ts` (around line 529-548)

```typescript
// MORE AGGRESSIVE SYNC: Update ALL players to ensure user_id matches player_id
// This handles edge cases where player_id is an auth UUID but user_id wasn't set
const { data: allPlayers } = await supabase
  .from('tv_players')
  .select('id, player_id, user_id')
  .eq('tv_session_id', sessionId);

if (allPlayers) {
  for (const player of allPlayers) {
    // If player_id looks like a UUID and user_id doesn't match, sync them
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(player.player_id);
    if (isValidUUID && player.user_id !== player.player_id) {
      await supabase
        .from('tv_players')
        .update({ user_id: player.player_id, is_active: true })
        .eq('id', player.id);
    }
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTVPoll.ts` | Add suggester fields to finalizePollAndStartGame, adjust active_player_count, enhance user_id sync |

---

## Expected Behavior After Fix

1. **Suggester ID correctly set** - When poll ends, the session has the correct `current_round_suggester_id`
2. **Suggester shows Observer UI** - Only the category suggester sees "შენი კატეგორიაა!" (This is your category!)
3. **Other players can answer** - All non-suggester players see answer buttons and can submit answers
4. **Correct player count** - `active_player_count` is adjusted for suggester skip rule
5. **All players have valid user_id** - RLS policies work correctly for all players
6. **Game only advances when ready** - Timer or all-answered, never prematurely

---

## Technical Details

### Why This Wasn't Caught Before

The issue only manifests in a specific scenario:
1. Multiple rounds with poll between them
2. The host's category wins the poll
3. The stale `current_round_suggester_id` from a previous round causes the host to be blocked
4. Meanwhile, the guest has NULL `user_id` causing their answers to fail silently

### The Console Logs Explained

```
[AutoAdvance] 📊 DB Status: {
  "actualAnswers": 0,      ← NO ONE could answer!
  "expectedPlayers": 2,    ← System expects 2
  "progress": "0/2"
}
```

The logs show 0 answers because:
- Host is blocked (thinks they're suggester from stale data)
- Guest's answers fail due to NULL `user_id` / RLS issues

The timer keeps running for 15 seconds, then expires and advances automatically.

### Implementation Order

1. Add suggester fields to `finalizePollAndStartGame` session update
2. Adjust `active_player_count` for suggester in the same function
3. Enhance `user_id` sync to be more aggressive
4. (Optional) Clear suggester on poll start for defense-in-depth
