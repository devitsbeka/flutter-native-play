
## Fix: Observer Auto-Advances Immediately Due to Stale Participant Data

### Root Cause

When the host starts a new game (via `startGame`, `startNewRound`, or `startNextFromQueue`), the flow is:

1. Reset all participants' `current_question` to 0 in the database
2. Set local state to `phase: "playing"` (observer screen mounts)
3. Observer screen reads `participants` from React state -- but these still have `current_question` values from the **previous** round (e.g., `current_question: 5`)
4. The realtime subscription triggers `fetchParticipants()` which will eventually update with `current_question: 0` -- but this hasn't arrived yet

The observer's auto-advance effect checks:
```
allPlayersAdvanced = otherPlayers.every(p => (p.current_question || 0) > currentQuestionIndex)
```

With stale data: `(5 || 0) > 0` = `true` -- the observer **immediately** calls `nextQuestion()`.

For a 1-question game, `nextQuestion()` sees `isLastQuestion = true` (index 0 >= length 1 - 1), marks the game as "completed", and transitions to results. The host sees "several pages fast" because the observer screen mounts and immediately unmounts as results appear.

The scores (474 and 224) are from a previous round -- they were never reset locally because the observer auto-advanced before the fresh participant data arrived.

### Technical Changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

**Fix 1: Immediately reset local `participants` state after DB reset (5 locations)**

After every `supabase.from("room_participants").update({ score: 0, current_question: 0 })` call, add an immediate local state reset:

```typescript
setParticipants(prev => prev.map(p => ({ ...p, score: 0, current_question: 0 })));
```

This ensures the observer screen sees `current_question: 0` right away, preventing the false `allPlayersAdvanced` trigger.

Locations:
- `startGame` user trivia path (after line ~1152)
- `startGame` library category path (after line ~1325)
- `startNewRound` user trivia path (after line ~1584)
- `startNewRound` library category path (after line ~1719)
- `startNextFromQueue` user trivia path (after line ~1904)
- `startNextFromQueue` library category path (after line ~2067)

**Fix 2: Merge early `host_is_observer` into final room update in `startGame` and `startNewRound`**

Same pattern we already fixed in `startNextFromQueue` -- the early standalone `host_is_observer` update can trigger premature realtime events.

In `startGame` (line ~1049-1052): Remove the early update. Include `host_is_observer: shouldObserve` in both final room updates (user trivia path at line ~1157 and library category path at line ~1327).

In `startNewRound` (line ~1528-1533): Remove the early update. Include `host_is_observer: hostShouldObserve` in both final room updates (user trivia path at line ~1636 and library category path at line ~1762).

### Why This Fixes The Issue

- Fix 1 eliminates the stale `current_question` race. The observer's auto-advance effect will see `current_question: 0` immediately, so `(0 > 0) = false` -- it won't fire until players genuinely advance.
- Fix 2 prevents premature realtime triggers in `startGame` and `startNewRound`, applying the same defensive pattern already in `startNextFromQueue`.

### Files Changed
- `src/contexts/MultiplayerContextV2.tsx` (~8 locations)
