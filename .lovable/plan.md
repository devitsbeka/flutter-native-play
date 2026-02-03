

# Fix: Non-Host Returned to Lobby After First Question of Round 2

## Root Cause Analysis

The console logs reveal a **race condition** where multiple question fetch loops run in parallel:

```
Round 2 starts successfully:
[MP] Non-host fetching questions with verified game_id: 5cf141f0-b98a-45f7-91e1-00394ab0d413  ✅
[MP] Found 5 questions matching game_id: 5cf141f0-b98a-45f7-91e1-00394ab0d413  ✅

STALE fetch from previous realtime event still running:
[MP] Waiting for questions with game_id 5e49c539-0738-4a53-b29a-cec590dd325b (attempt 1/8)  ❌ OLD ID
[MP] Failed to fetch questions for game_id 5e49c539-0738-4a53-b29a-cec590dd325b after 8 attempts
→ Calls setState({ phase: "lobby" })  ❌ OVERWRITES GOOD STATE
```

### Why This Happens

1. Realtime subscription receives multiple UPDATE events (for round 1 status changes, then round 2)
2. Each triggers a new fetch loop with the game_id from that moment
3. Old fetch loops continue running even after new ones succeed
4. When stale fetch fails, it sets `phase: "lobby"` AFTER the new round already started

---

## Solution

### Change 1: Add Current Game ID Tracking Ref

Create a ref to track the "expected" game_id so stale fetches can detect they're outdated and abort.

**File**: `src/contexts/MultiplayerContextV2.tsx`

Add ref around line 250 (near other refs):
```typescript
const expectedGameIdRef = useRef<string | null>(null);
```

### Change 2: Guard Stale Fetch Completion

Before returning to lobby on fetch failure, verify the game_id we were fetching is still the current one.

**File**: `src/contexts/MultiplayerContextV2.tsx`

Update the realtime handler (lines ~330-420):

```typescript
// Before starting fetch, store expected game_id in ref
expectedGameIdRef.current = expectedGameId;

// ... existing fetch loop ...

// Before setting phase back to lobby, check if this is still the current game
if (expectedGameIdRef.current !== expectedGameId) {
  console.log(`[MP] Aborting stale fetch - game_id changed from ${expectedGameId} to ${expectedGameIdRef.current}`);
  return; // Exit without modifying state - new game already started
}

// Only set lobby if we're still looking for this game_id
toast.error("კითხვების სინქრონიზაცია ვერ მოხერხდა. ცადე თავიდან.");
setState(prev => ({
  ...prev,
  phase: "lobby",
  currentRoom: updated,
}));
```

### Change 3: Check Game ID During Fetch Loop

Add early-exit check inside the retry loop:

```typescript
while (attempts < MAX_ATTEMPTS && !validQuestionsFound) {
  // Check if a newer game has started
  if (expectedGameIdRef.current !== expectedGameId) {
    console.log(`[MP] Aborting fetch loop - newer game started`);
    return;
  }
  
  // ... existing fetch logic ...
}
```

### Change 4: Increase Delay in startNextFromQueue

Both paths in `startNextFromQueue` use 150ms delay, but `saveQuestionsAndStartGame` uses 300ms. Make them consistent.

**File**: `src/contexts/MultiplayerContextV2.tsx`

Line 1783 (user_trivia path):
```typescript
// CRITICAL: Wait for DB commit before updating room status
await new Promise(resolve => setTimeout(resolve, 300)); // Changed from 150ms
```

Line 1940 (library path):
```typescript
// CRITICAL: Wait for DB commit before updating room status
await new Promise(resolve => setTimeout(resolve, 300)); // Changed from 150ms
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~250 | Add `expectedGameIdRef` to track current game_id |
| Line ~343 | Store expected game_id in ref before fetch |
| Lines ~355-380 | Add early-exit check in fetch loop if game_id changed |
| Lines ~405-415 | Guard lobby transition - abort if game_id changed |
| Line ~1783 | Increase delay from 150ms to 300ms (user_trivia) |
| Line ~1940 | Increase delay from 150ms to 300ms (library) |

---

## How This Fixes the Bug

1. **Before** round 2 starts, ref holds round 1's game_id
2. **When** round 2 starts, ref is updated to round 2's game_id
3. **When** stale fetch for round 1's game_id fails, it checks ref
4. Ref now holds round 2's game_id → mismatch detected → stale fetch aborted
5. User stays in `phase: "playing"` with correct questions

---

## Testing Checklist

1. Play round 1 to completion
2. Host adds category to queue → lobby opens
3. Host starts round 2
4. Both players should see questions and stay in playing phase
5. Complete round 2 → both see results
6. Repeat for round 3 to ensure stability

