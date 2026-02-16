

# TV Mode Bug Fixes: Stuck Questions, Guest Disconnects, Category Repetition

## Issues Found

### Issue 1: Game Stuck on Question (Host Needs Refresh)

**Root Cause:** The heartbeat recovery check (runs every 5 seconds) compares elapsed time against `QUESTION_TIME + 5` but only fires `advanceToReveal`, which has a guard: `if (current.phase !== 'question') return`. The problem is that `advanceToReveal` checks `stateRef.current.phase`, but when the host's timer interval pauses (screen lock, tab switch, CPU throttle), the local `phase` may still be `'question'` while the `hasAdvancedRef` got set to `true` from a previous partial execution, or the `checkInProgressRef` gets stuck as `true` from a failed async call that never hit the `finally` block. Once either ref is stuck, all advancement paths are permanently blocked.

**Fix:**
- Add a safety reset for `checkInProgressRef` in the heartbeat: if it's been `true` for more than 5 seconds, force it to `false`
- In the heartbeat, bypass the `hasAdvancedRef` guard since this is a stuck-game recovery path -- reset it before calling `advanceToReveal`
- Add a maximum staleness check: if `questionStartedAtRef` is set and more than `QUESTION_TIME + 10` seconds have passed, force-advance regardless of ref states

### Issue 2: Guests Getting Kicked / Difficulty Rejoining

**Root Cause:** Two issues combine:
1. The `useIdleTimeout` hook in `TVJoin.tsx` fires after 60 seconds if the `phase` value hasn't changed. During long question rounds (10 questions x 15s each = 150s+), the phase stays as `'question'` the entire time. But the idle timeout watches the `phase` string -- since it remains `'question'` throughout, the 60-second timer fires and calls `leaveSession()` + navigates to `/`.
2. Once kicked, guests must scan QR or re-enter the code because there's no session persistence in localStorage for the guest's current session.

**Fix:**
- Change the idle timeout `watchValue` in `TVJoin.tsx` from just `phase` to a composite value that includes `currentQuestionIndex`. This way, every new question resets the 60s timer. The phase + question index combination changes frequently during gameplay, preventing false idle detection.
- Additionally, increase the timeout to 120 seconds for extra safety margin.

### Issue 3: First Category Repeats Instead of Playing Next Category

**Root Cause:** In `finalizePollAndStartGame` (useTVPoll.ts), the queue is built with ALL top suggestions at positions 0, 1, 2, etc. The first suggestion's questions are loaded directly and the session goes to countdown. However, **the queue item at position 0 is never consumed/deleted**. When round 1 ends and `startNextRoundFromQueueIfAny` runs, it queries `.order('position', { ascending: true }).limit(1)` and gets position 0 again -- the same category that just played.

**Fix:**
- After inserting the queue items and successfully starting countdown with the first category's questions, delete the position 0 item from `tv_session_queue`. This way, when `startNextRoundFromQueueIfAny` runs after round 1, it picks position 1 (the actual second category).

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Issue 1 fix -- Heartbeat stuck recovery (lines ~1280-1307):**
- Add a timestamp tracker for when `checkInProgressRef` was set to `true`
- In the heartbeat interval, if `checkInProgressRef` has been `true` for >5s, force-reset it
- Reset `hasAdvancedRef` before calling `advanceToReveal` in the stuck recovery path
- Increase the staleness threshold to `QUESTION_TIME + 10` for absolute forced recovery

### File: `src/pages/TVJoin.tsx`

**Issue 2 fix -- Idle timeout false trigger (line ~37):**
- Change `useIdleTimeout(phase, ...)` to `useIdleTimeout(`${phase}-${currentQuestionIndex}`, ...)`
- Pull `currentQuestionIndex` from the `useTVGame()` context (already available via `questions` array, but need the index directly)
- Increase timeout from 60s to 120s

### File: `src/hooks/useTVPoll.ts`

**Issue 3 fix -- Queue item not consumed (after line ~731):**
- After the batch insert of queue items and after successfully starting countdown with the first category, delete the first queue item (position 0) from `tv_session_queue`
- This ensures `startNextRoundFromQueueIfAny` picks the next unplayed category

