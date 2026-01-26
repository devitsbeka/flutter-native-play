
# Fix: Guest Players Can't Play After Poll

## Problem Summary

Guest players (who join via QR code) cannot participate in the game after a poll ends because:

1. **They don't receive the questions array** via the realtime subscription during the poll-to-countdown transition
2. **No fallback fetch mechanism** exists to recover from missed realtime updates
3. **The error screen blocks them** when `questions.length === 0` during `playing` phase

## Root Cause Analysis

### The Flow That Breaks

```text
1. Guest joins during poll phase
   → Session has NO questions (poll phase doesn't have questions)
   → Guest state: questions = []

2. Host finalizes poll → Session updated with questions
   → Realtime event sent to all subscribers
   → Guest's subscription SHOULD receive it...
   
3. BUT: Guest might miss the update if:
   - Network latency
   - Subscription not fully synced
   - Browser tab was in background (Safari throttling)
   - Reconnection in progress

4. Guest transitions to 'playing' phase
   → TVJoin.tsx checks: hasInvalidState = phase === 'playing' && questions.length === 0
   → Shows "თამაში არ არის მზად" (Game not ready) error screen
   → Guest can't play!
```

### Evidence from Code

**TVJoin.tsx (lines 54-77):**
```typescript
const requiresQuestions = ['question', 'playing', 'reveal'].includes(phase);
const hasInvalidState = requiresQuestions && (!questions || questions.length === 0);

if (hasInvalidState) {
  // Shows error screen - Guest is blocked!
}
```

**TVGameContext.tsx (line 1356):**
```typescript
questions: questions.length > 0 ? questions : prev.questions,
```
This only preserves `prev.questions` - if BOTH are empty, guest has no questions.

---

## The Solution: Proactive Session Refetch on Phase Change

### Fix 1: Add Session Refetch Function

Create a utility function that can be called to force-fetch the current session state:

**File:** `src/contexts/TVGameContext.tsx`

Add a new function `refetchSession` that:
1. Fetches the full session from the database
2. Updates state with questions, suggester info, and other critical fields
3. Can be called when phase changes to `countdown` or `playing`

### Fix 2: Auto-Refetch on Critical Phase Transitions

**File:** `src/contexts/TVGameContext.tsx`

In the session subscription handler, when transitioning FROM poll phases TO game phases:
- Detect: `prev.phase.includes('poll') && ['countdown', 'playing'].includes(newPhase)`
- If `questions.length === 0`, trigger a full session refetch
- This ensures guests recover from missed realtime updates

### Fix 3: Remove Blocking Error Screen, Show Loading Instead

**File:** `src/pages/TVJoin.tsx`

Instead of showing an error screen when `questions.length === 0` during `playing` phase:
- Show a loading spinner with "იტვირთება კითხვები..." (Loading questions...)
- Trigger a session refetch
- Auto-recover when questions arrive

### Fix 4: Add Suggester Fields to Subscription Type

**File:** `src/contexts/TVGameContext.tsx`

Add the missing fields to the `newData` type definition to ensure TypeScript properly handles them:
```typescript
current_round_suggester_id?: string | null;
current_round_suggester_nickname?: string | null;
current_round_suggester_avatar_url?: string | null;
```

---

## Technical Implementation Details

### New `refetchSession` Function

```typescript
const refetchSession = async (sessionId: string) => {
  console.log('[refetchSession] 🔄 Force-fetching session state...');
  
  const { data: session, error } = await supabase
    .from('tv_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  
  if (error || !session) {
    console.error('[refetchSession] Failed:', error);
    return;
  }
  
  // Parse questions
  let questions: TVQuestion[] = [];
  if (session.questions) {
    const rawQuestions = session.questions as unknown as Array<...>;
    questions = rawQuestions.map(q => ({...}));
  }
  
  setState(prev => ({
    ...prev,
    questions: questions.length > 0 ? questions : prev.questions,
    currentRoundSuggesterId: session.current_round_suggester_id ?? null,
    currentRoundSuggesterNickname: session.current_round_suggester_nickname ?? null,
    currentRoundSuggesterAvatarUrl: session.current_round_suggester_avatar_url ?? null,
    // ... other fields
  }));
  
  console.log('[refetchSession] ✅ Loaded', questions.length, 'questions');
};
```

### Phase Transition Recovery

```typescript
// In setupSessionSubscription, after detecting phase change:
if (prevPhaseRef.current?.includes('poll') && ['countdown', 'playing'].includes(newPhase)) {
  // Give realtime a moment to deliver the full payload
  setTimeout(async () => {
    if (stateRef.current.questions.length === 0) {
      console.log('[Subscription] ⚠️ No questions after poll->game transition, refetching...');
      await refetchSession(sessionId);
    }
  }, 500);
}
```

### TVJoin.tsx Recovery UI

```typescript
if (hasInvalidState) {
  // Instead of error, show loading and trigger refetch
  return (
    <div className="...loading screen...">
      <Loader2 className="animate-spin" />
      <p>იტვირთება კითხვები...</p>
    </div>
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/TVGameContext.tsx` | Add `refetchSession` function, update subscription type, add auto-recovery on phase transitions |
| `src/pages/TVJoin.tsx` | Replace blocking error with loading + auto-refetch |
| `src/components/controller/ControllerQuestion.tsx` | Add defensive check before rendering, trigger refetch if needed |

---

## Expected Behavior After Fix

1. **Guest joins during poll** → Has no questions (expected)
2. **Poll ends, game starts** → Realtime sends questions
3. **If guest misses update** → Auto-refetch triggers within 500ms
4. **Guest sees loading briefly** → Then questions appear
5. **All players can answer** → Game proceeds normally

---

## Why This Will Work

1. **Redundancy**: Even if realtime fails, the fallback fetch ensures data arrives
2. **Non-blocking**: Loading UI keeps guest engaged instead of showing error
3. **Automatic**: No user action required - system self-heals
4. **Fast**: 500ms delay is imperceptible to users
5. **Defensive**: Works regardless of network conditions or browser throttling
