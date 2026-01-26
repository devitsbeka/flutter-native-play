
# Fix: Guest Players Can't Join/Play After Poll

## Problem Identified

After extensive code analysis, I identified a critical bug in `TVJoin.tsx` that prevents guests from playing after a poll:

**The `refetchSession` function in `TVJoin.tsx` fetches session data but NEVER updates the context state.**

The current code (lines 65-88) contains this flawed logic:
```typescript
const refetchSession = async () => {
  const { data: session } = await supabase.from('tv_sessions').select('*')...
  console.log('[TVJoin] Refetched session:', { ... });
  // Comment says: "The realtime subscription should pick up this fetch"
  // ❌ THIS IS WRONG - a SELECT query doesn't trigger realtime events!
};
```

Meanwhile, `TVGameContext.tsx` has a proper `refetchSessionData` function that correctly updates state, but it's not being used in `TVJoin.tsx`.

---

## Root Cause Flow

```text
1. Guest joins during poll phase
   → State: phase='poll-voting', questions=[]

2. Host finalizes poll → DB updated with questions
   → Realtime event sent to subscribers

3. Guest's realtime subscription might MISS the update
   → Due to: network latency, background tabs, reconnection

4. TVJoin.tsx detects hasInvalidState (phase='playing' but questions=[])
   → Shows loading screen
   → Calls refetchSession()

5. refetchSession() fetches data BUT DOESN'T UPDATE STATE
   → Data is fetched and logged, then discarded!
   → questions[] remains empty
   → Guest stays stuck in loading screen

6. Guest cannot play - blocked indefinitely
```

---

## The Fix

### Option 1: Use TVGameContext's refetchSessionData (Preferred)

Expose `refetchSessionData` from the context and use it in `TVJoin.tsx`:

**File:** `src/contexts/TVGameContext.tsx`
- Add `refetchSessionData` to the context interface and value

**File:** `src/pages/TVJoin.tsx`
- Import and call `refetchSessionData` from the context instead of using a broken local function

### Option 2: Fix the local refetchSession in TVJoin.tsx

Parse the fetched data and update the context state directly:

**File:** `src/pages/TVJoin.tsx`
- After fetching session data, parse the questions and call a context update function

---

## Implementation Details

### Step 1: Add refetchSessionData to TVGameContext exports

Modify the context interface to expose the refetch function:

```typescript
interface TVGameContextType extends TVGameState {
  // ... existing methods ...
  refetchSessionData: () => Promise<void>;  // NEW
}
```

### Step 2: Update TVJoin.tsx to use context refetch

Replace the broken local function with the context function:

```typescript
const { phase, sessionId, questions, refetchSessionData, myPlayerId, players } = useTVGame();

// In the useEffect:
useEffect(() => {
  if (hasInvalidState && sessionId) {
    console.log('[TVJoin] ⚠️ Invalid state - triggering context refetch...');
    const timer = setTimeout(() => {
      refetchSessionData(); // Uses context's state-updating function
    }, 500);
    return () => clearTimeout(timer);
  }
}, [hasInvalidState, sessionId, refetchSessionData]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/TVGameContext.tsx` | Add `refetchSessionData` to context interface and value export |
| `src/pages/TVJoin.tsx` | Use context's `refetchSessionData` instead of broken local function |

---

## Expected Behavior After Fix

1. Guest joins during poll → `questions=[]`
2. Poll ends, game starts → Realtime updates questions
3. If realtime is missed → `hasInvalidState` triggers
4. `refetchSessionData()` fetches and **updates context state**
5. Questions appear → Guest can play!

---

## Why This Will Work

1. **State is actually updated** - The context's `refetchSessionData` calls `setState` with fetched data
2. **All subscribers get updated** - State change propagates to all components
3. **Retry logic works** - The `useEffect` will retry if still in invalid state
4. **Consistent implementation** - Same refetch logic used everywhere

---

## Additional Considerations

The same pattern should be verified in other places where manual refetch might be needed, such as:
- `ControllerQuestion.tsx` - Already has proper error handling UI
- Network reconnection scenarios - Consider adding a refetch after connection restoration

This fix addresses the core issue where guests appear to join successfully but get stuck in a loading state after the poll ends.
