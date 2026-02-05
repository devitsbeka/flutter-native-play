
# Plan: "Game is Always On" - Resilient TV Mode Gameplay

## Problem Analysis

When players' screens lock/sleep during TV mode gameplay, several issues occur:

1. **Presence disconnects** - The Supabase presence channel disconnects when the browser goes to background/sleeps
2. **Timer pauses** - JavaScript timers pause when the tab is in background (especially on mobile)
3. **Player count mismatch** - The game locks `active_player_count` at round start, but if players disconnect, the game still waits for their answers
4. **No reconnection handling** - When players return (screen unlocks), there's no proactive sync to catch up with the game state
5. **No visibility change listeners** - The TV game context doesn't listen for `visibilitychange` events

## Solution Overview

Implement a resilient "game always on" approach with three key components:

1. **Visibility-aware presence reconnection** - Re-sync when players return from screen lock
2. **Dynamic player count adjustment** - Adjust expected answers based on currently connected players
3. **Timer resilience** - Handle host timer pauses gracefully

---

## Technical Implementation

### 1. Add Visibility Change Handling in TVGameContext

**File: `src/contexts/TVGameContext.tsx`**

Add a new effect that listens for `visibilitychange` events:

```typescript
// After the presence channel setup, add visibility change handling
useEffect(() => {
  if (!state.sessionId) return;
  
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      console.log('[Visibility] 👀 App returned to foreground');
      
      // Step 1: Re-sync session state from database
      await refetchSessionData(state.sessionId!);
      
      // Step 2: Re-track presence to mark as active
      if (presenceChannelRef.current && myPlayerId) {
        const me = state.players.find(p => p.id === myPlayerId);
        await presenceChannelRef.current.track({
          nickname: me?.nickname || 'Player',
          avatar_url: me?.avatar_url ?? null,
          score: me?.score ?? myScore,
          hasAnswered: myAnswer !== null,
          lastAnswerCorrect: me?.lastAnswerCorrect ?? null,
          lastAnswer: myAnswer,
          isHost: isHost,
          isActive: true,
        });
        console.log('[Visibility] ✅ Re-tracked presence as active');
      }
      
      // Step 3: If in question phase, sync timer
      if (stateRef.current.phase === 'question') {
        const { data: session } = await supabase
          .from('tv_sessions')
          .select('question_start_time')
          .eq('id', state.sessionId)
          .single();
        
        if (session?.question_start_time) {
          const startTime = new Date(session.question_start_time).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, QUESTION_TIME - elapsed);
          
          setState(prev => ({ ...prev, timeRemaining: remaining }));
          console.log('[Visibility] ⏱️ Synced timer: elapsed', elapsed, 'remaining', remaining);
        }
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [state.sessionId, myPlayerId, isHost, myScore, myAnswer, refetchSessionData]);
```

### 2. Dynamic Player Count Adjustment for Auto-Advance

**File: `src/contexts/TVGameContext.tsx`**

Modify `checkAndAdvanceIfAllAnswered` to use a hybrid approach:

Currently (lines ~759-772):
```typescript
const expectedCount = session.active_player_count ?? liveActiveCount ?? 0;
// ...
if (expectedCount <= 0) {
  console.log('[AutoAdvance] ⏭️ Skip: expectedCount is 0 (no eligible players)');
  return;
}
```

Change to:
```typescript
// Use the MINIMUM of locked count and live count
// This allows advancement when some players have left
const lockedCount = session.active_player_count ?? 0;
const liveCount = liveActiveCount ?? 0;

// If live count is 0, someone's presence hasn't synced yet - use locked count
// If live count > 0 but < locked, some players left - use live count
// If live count >= locked, all expected players are present - use locked count
let expectedCount = lockedCount;
if (liveCount > 0 && liveCount < lockedCount) {
  expectedCount = liveCount;
  console.log('[AutoAdvance] 📉 Adjusted expected count from', lockedCount, 'to', liveCount, '(players left)');
}

console.log('[AutoAdvance] 🎯 Using player count:', {
  lockedCount,
  liveActiveCount: liveCount,
  finalExpected: expectedCount,
});

// SAFETY: If no players at all (everyone disconnected), let timer handle it
if (expectedCount <= 0 && liveCount <= 0) {
  console.log('[AutoAdvance] ⏭️ Skip: no active players - timer will handle');
  return;
}
```

### 3. Host Timer Resilience

**File: `src/contexts/TVGameContext.tsx`**

Add visibility handling specifically for the host timer. When the host's screen locks and unlocks, the timer needs to catch up:

```typescript
// In the timer useEffect (around line 1222), add visibility-aware timer sync:
useEffect(() => {
  if (state.phase !== 'question') return;
  if (!state.sessionId) return;
  
  // Timer sync on visibility change (host only)
  const syncTimerOnVisibility = async () => {
    if (document.visibilityState !== 'visible') return;
    if (!isHostRef.current) return;
    
    // Fetch actual start time from DB and recalculate
    const { data: session } = await supabase
      .from('tv_sessions')
      .select('question_start_time, status')
      .eq('id', state.sessionId)
      .single();
    
    if (session?.question_start_time && session.status === 'playing') {
      const startTime = new Date(session.question_start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, QUESTION_TIME - elapsed);
      
      console.log('[Timer] 🔄 Host visibility sync: elapsed', elapsed, 'remaining', remaining);
      
      if (remaining <= 0) {
        // Timer should have expired while screen was locked
        console.log('[Timer] ⏰ Timer expired during sleep - advancing now');
        advanceToReveal('timer expired (visibility sync)');
      } else {
        setState(prev => ({ ...prev, timeRemaining: remaining }));
      }
    }
  };
  
  document.addEventListener('visibilitychange', syncTimerOnVisibility);
  
  // Existing timer countdown logic...
  timerRef.current = setInterval(() => { /* ... */ }, 1000);
  
  return () => {
    document.removeEventListener('visibilitychange', syncTimerOnVisibility);
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [state.phase, state.sessionId, advanceToReveal]);
```

### 4. Add Fallback Timer Check for Stuck Games

**File: `src/contexts/TVGameContext.tsx`**

Add a "heartbeat" check that runs every 5 seconds to catch stuck timers:

```typescript
// New effect: Heartbeat check for stuck games (host only)
useEffect(() => {
  if (!isHost) return;
  if (state.phase !== 'question') return;
  if (!state.sessionId) return;
  
  const heartbeatCheck = async () => {
    const { data: session } = await supabase
      .from('tv_sessions')
      .select('question_start_time, status')
      .eq('id', state.sessionId)
      .single();
    
    if (!session?.question_start_time || session.status !== 'playing') return;
    
    const startTime = new Date(session.question_start_time).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // If more than QUESTION_TIME + 5 seconds have passed, force advance
    if (elapsed > QUESTION_TIME + 5) {
      console.log('[Heartbeat] ⚠️ Game stuck! Elapsed:', elapsed, 'seconds. Forcing advance.');
      advanceToReveal('heartbeat stuck recovery');
    }
  };
  
  const interval = setInterval(heartbeatCheck, 5000);
  
  return () => clearInterval(interval);
}, [isHost, state.phase, state.sessionId, advanceToReveal]);
```

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/contexts/TVGameContext.tsx` | Add `visibilitychange` listener for session re-sync | Recover state when player returns from screen lock |
| `src/contexts/TVGameContext.tsx` | Modify `checkAndAdvanceIfAllAnswered` to use MIN(locked, live) count | Advance when some players leave mid-game |
| `src/contexts/TVGameContext.tsx` | Add visibility-aware timer sync for host | Catch up timer after host screen lock |
| `src/contexts/TVGameContext.tsx` | Add heartbeat check every 5s | Recover from stuck games |

---

## Expected Behavior After Implementation

1. **Player screen locks then unlocks**: 
   - Presence re-tracked immediately
   - Session state refetched
   - Timer synced to current server time
   - Player can continue answering if time remains

2. **Some players leave mid-game**:
   - Game uses live presence count
   - Advances as soon as remaining players answer
   - Timer still works as backup

3. **Host screen locks**:
   - When host returns, timer syncs to server time
   - If timer should have expired, immediately advances
   - Heartbeat catches any stuck states

4. **All players disconnect except one**:
   - Game continues for remaining player
   - Timer countdown continues
   - Game advances normally

---

## Testing Recommendations

After implementation:
1. Start a 2+ player TV game
2. Lock one player's phone screen during a question
3. Unlock and verify they can still answer (if time remains)
4. Lock host phone during question, unlock after 10+ seconds
5. Verify game advances properly when timer "should have" expired
