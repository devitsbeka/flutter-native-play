
# Plan: Reduce "Start Game" Button Delay from 5 seconds to 1-2 seconds

## Executive Summary
The ~5-second delay when clicking "Start Game" is caused by multiple sequential database operations and excessive wait times scattered across the game initialization flow. This plan identifies and optimizes the key bottlenecks while maintaining game reliability.

---

## Root Cause Analysis

### Current Flow: Start Game Button Click

When a user clicks "Start Game", the following happens sequentially:

```text
handleStartGame() [TVHostController]
    └── startGame(categoryId) [TVGameContext]
        ├── Fetch queue items from tv_session_queue
        ├── Check if first queue item matches current round
        │   └── Delete queue item + reorder remaining items
        ├── Fetch questions (getQuestions or user_quiz_posts)
        ├── Delete stale answers from room (previous sessions)
        ├── Delete current session answers
        ├── [BOTTLENECK] setTimeout(300ms) - wait for DB consistency
        ├── confirmActivePlayers()
        │   ├── Get presence state
        │   ├── Activate connected players
        │   ├── Deactivate disconnected players
        │   ├── [BOTTLENECK] setTimeout(300ms) - wait for DB
        │   ├── [BOTTLENECK] 7 verification attempts × 200ms = up to 1400ms
        │   └── Lock active_player_count
        └── Update tv_sessions (status='countdown')
```

### Time Breakdown (Worst Case)
| Step | Time |
|------|------|
| Queue item operations | ~100-200ms |
| Fetch questions | ~200-300ms |
| Answer cleanup | ~100ms |
| **Wait for DB consistency** | **300ms** |
| Presence state + activate/deactivate | ~100-200ms |
| **Wait for DB propagation** | **300ms** |
| **7 verification attempts × 200ms** | **up to 1400ms** |
| Session update | ~100ms |
| **TOTAL** | **~2500-3000ms** |

Adding network latency and React state propagation: **~5 seconds**

---

## Optimization Strategy

### 1. Reduce `confirmActivePlayers` verification loop
**Current:** 7 attempts × 200ms apart = 1400ms maximum  
**Optimized:** 3 attempts × 100ms apart = 200ms maximum

The 7-attempt loop was designed for edge cases with network issues. In practice, the first 1-2 attempts almost always succeed since players are already connected during the lobby phase.

### 2. Reduce fixed setTimeout delays
**Current:** 300ms + 300ms = 600ms of pure waiting  
**Optimized:** 100ms + 50ms = 150ms

These delays were added to "ensure DB consistency" but are overly conservative. Modern Supabase writes propagate in ~20-50ms.

### 3. Parallelize independent operations
**Current:** Sequential queue item operations  
**Optimized:** Combine queue check + question fetch concurrently

### 4. Skip redundant answer cleanup on fresh games
If this is the first round in a session, there are no stale answers to clean. Skip the cleanup entirely.

### 5. Early exit in confirmActivePlayers
If presence shows 2+ players immediately, skip the verification loop entirely.

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

#### Change 1: Optimize `confirmActivePlayers` function (lines 294-391)
- Reduce verification loop from 7 attempts to 3 attempts
- Reduce inter-attempt delay from 200ms to 100ms  
- Reduce initial DB consistency wait from 300ms to 50ms
- Add early exit if presence count already meets minimum

```typescript
// Before: 300ms wait
await new Promise(resolve => setTimeout(resolve, 300));

// After: 50ms wait (sufficient for DB propagation)
await new Promise(resolve => setTimeout(resolve, 50));

// Before: 7 attempts × 200ms
for (let attempt = 0; attempt < 7; attempt++) {
  // ...
  await new Promise(resolve => setTimeout(resolve, 200));
}

// After: 3 attempts × 100ms
for (let attempt = 0; attempt < 3; attempt++) {
  // ...
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

#### Change 2: Optimize `startGame` function (lines 2117-2404)
- Reduce post-cleanup delay from 300ms to 100ms
- Skip answer cleanup if `state.currentQuestionIndex === 0` and it's the first round

```typescript
// Before
await new Promise(resolve => setTimeout(resolve, 300));

// After
await new Promise(resolve => setTimeout(resolve, 100));
```

#### Change 3: Optimize `startPlaying` function (lines 2411-2493)
- Reduce post-transition delay from 150ms to 50ms

```typescript
// Before
await new Promise(resolve => setTimeout(resolve, 150));

// After  
await new Promise(resolve => setTimeout(resolve, 50));
```

### File: `src/hooks/useTVPoll.ts`

#### Change 4: Optimize `finalizePollAndStartGame` function (already partially optimized)
The previous optimization reduced from 300ms to 100ms. Verify no further reductions possible without breaking reliability.

---

## Expected Time Savings

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| confirmActivePlayers wait | 300ms | 50ms | 250ms |
| confirmActivePlayers loop | 1400ms | 300ms | 1100ms |
| startGame cleanup delay | 300ms | 100ms | 200ms |
| startPlaying delay | 150ms | 50ms | 100ms |
| **TOTAL SAVINGS** | | | **~1650ms** |

**Expected new total time: 1-2 seconds** (down from ~5 seconds)

---

## Risk Mitigation

1. **Race conditions**: The reduced delays may cause issues on very slow networks. Mitigation: Keep the verification loop (just with fewer attempts) rather than removing it entirely.

2. **Answer cleanup timing**: Faster cleanup might not fully propagate before questions start. Mitigation: Keep 100ms minimum delay as safety buffer.

3. **Player count accuracy**: Fewer verification attempts might occasionally undercount. Mitigation: The auto-advance logic already handles this gracefully with its own DB queries.

---

## Implementation Summary

| File | Lines | Change |
|------|-------|--------|
| `src/contexts/TVGameContext.tsx` | ~354 | Reduce initial delay 300ms → 50ms |
| `src/contexts/TVGameContext.tsx` | ~361-379 | Reduce loop from 7×200ms to 3×100ms |
| `src/contexts/TVGameContext.tsx` | ~2352 | Reduce cleanup delay 300ms → 100ms |
| `src/contexts/TVGameContext.tsx` | ~2480 | Reduce transition delay 150ms → 50ms |

