

# Root Cause Fix: RLS Blocking Host from Managing Players

## Executive Summary

After deep investigation, I've identified the **fundamental root cause** of the post-poll game breakdown: **Row Level Security (RLS) blocks the host from updating guest player records**.

When `finalizePollAndStartGame` runs, it attempts to:
1. Reset all players to `is_active: true`
2. Sync `user_id` for players with NULL values

But these operations **silently fail** for guest players because the RLS UPDATE policy prevents the authenticated host from modifying records where `user_id IS NULL`.

---

## Technical Root Cause

### The RLS Policy (Current State)

```sql
CREATE POLICY "Players can update their own record" 
ON public.tv_players FOR UPDATE 
USING (
  -- Authenticated users update their own
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Guest users update records with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);
```

### Why It Fails

| Scenario | auth.uid() | Target user_id | Policy Check | Result |
|----------|-----------|----------------|--------------|--------|
| Host updates self | `host_id` | `host_id` | `host_id = host_id` | PASS |
| Host updates guest | `host_id` | `NULL` | `host_id = NULL` | **FAIL** |
| Guest updates self | `NULL` | `NULL` | `NULL AND NULL` | PASS |

The host cannot update guest player records because the policy requires `auth.uid() = user_id`, which is FALSE when `user_id IS NULL`.

### The Chain Reaction

1. `finalizePollAndStartGame` calls bulk update `is_active: true` for ALL players
2. RLS silently blocks the update for guest players (only host's own record is updated)
3. Guest remains with `is_active: false` or outdated status
4. Player count query returns 1 (only host is active)
5. After suggester adjustment: `expectedCount = max(1, 2) - 1 = 1`
6. Host answers first → system thinks all 1 expected players answered
7. Game advances immediately, blocking other players

---

## The Solution: Host Session Management Policy

Create a new RLS policy that allows **hosts to manage all players in their session**.

### Database Migration

```sql
-- Allow hosts to update any player in their session
-- This is safe because hosts already have full control via tv_sessions

DROP POLICY IF EXISTS "Host can update session players" ON public.tv_players;

CREATE POLICY "Host can update session players" 
ON public.tv_players FOR UPDATE 
USING (
  -- Existing: Players can update their own record
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  (auth.uid() IS NULL AND user_id IS NULL)
  OR
  -- NEW: Hosts can update ANY player in their session
  EXISTS (
    SELECT 1 FROM tv_sessions ts
    WHERE ts.id = tv_players.tv_session_id
    AND ts.host_user_id = auth.uid()
  )
);
```

This adds a third condition: **if the current user is the host of this session, they can update any player record in that session**.

---

## Implementation Steps

### Step 1: Create Database Migration

Add a new migration that updates the RLS policy to allow hosts to manage their session players.

### Step 2: Verify Existing Code Works

Once the RLS is fixed, the existing code in `finalizePollAndStartGame` will work correctly:
- Bulk `is_active` reset will affect ALL players
- `user_id` sync will properly update guest records
- Player count will accurately reflect all active players

### Step 3: Add Defensive Logging

Add explicit error checking for the bulk update operations to catch any future RLS issues.

---

## Expected Behavior After Fix

1. **Bulk reset works** - Host's `is_active: true` update affects ALL players in the session
2. **user_id sync works** - Host can properly sync `user_id` for authenticated guests
3. **Player count is accurate** - All active players are counted correctly
4. **All players can answer** - Game waits for the correct number of players
5. **Smooth poll-to-game transition** - Single click starts the game properly

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration file | Add RLS policy allowing hosts to update session players |
| `src/hooks/useTVPoll.ts` | Add explicit error handling for bulk operations |

---

## Security Considerations

This policy change is **safe** because:
1. Hosts already have complete control over their sessions (can delete, modify status, etc.)
2. The policy only allows updates to players within the host's OWN session
3. The EXISTS subquery validates session ownership through `host_user_id`
4. This mirrors the existing "Host can delete players" policy which uses the same pattern

---

## Alternative Approaches (Considered but Not Recommended)

1. **SECURITY DEFINER function** - More complex, requires edge function or RPC call
2. **Remove RLS on tv_players** - Not safe, breaks security model
3. **Have each player sync themselves** - Unreliable, race conditions

The RLS policy update is the cleanest, most secure solution.

