# Words (friend-vs-friend) mode — stress test findings

**Method:** direct-network testing (Node + `@supabase/supabase-js`) against the live backend, driving the actual realtime/table contracts from `src/features/words/useWordsRoom.ts`. Harness (throwaway, not shipped): `.qa-scratch/words-stress/` (gitignored).

**The P0 data-exposure finding this testing surfaced is written up on its own in `01-CRITICAL-room-data-exposure.md`** because it's cross-cutting (affects `game_rooms`/`room_participants`, shared by every room-based mode) rather than Words-specific. This file covers the rest.

## Correction to the assumed architecture

Going in, the assumption was that Words has a server-side "submit a move" RPC like TV mode's `submit_tv_answer`. It does not:

- Room creation/joining is a direct client insert/select on `game_rooms` + `room_participants` (`useWordsRoom.ts:140-228`) — the same mechanism Team Battle/King's lobby uses, and the same tables the P0 finding is about.
- The actual board (`found`, `bonus`, `hinted`, `level`) is a **pure client-side CRDT** (`src/features/words/shared.ts`), exchanged only over a Supabase Realtime **broadcast** channel `words-board-${room.id}` (`useWordsRoom.ts:285-326`) plus presence keyed by `user.id`. It is never written to any table.
- `WordsGame.submit()`/`commit()` (`WordsGame.tsx:273-298, 368-416`) checks a guessed word against the level's word list, which ships bundled client-side (`levels.*.generated.ts`) for every level regardless of progress — there is no server-side "solution" to leak, so the access-control gap here is a tamper-integrity problem, not a spoiler leak.

## Summary

| # | Scenario | Verdict |
|---|---|---|
| 1 | Two-player room, full game | PASS |
| 2 | Simultaneous "found the same word" from both players | **CONCERN — scoring can disagree between clients** |
| 3 | Disconnect / reconnect mid-game | PASS |
| 4 | Foreign/unauthorized room+channel access | **P0 — see `01-CRITICAL-room-data-exposure.md`** |
| 5 | Bad/nonexistent room code | PASS |

## Finding (P2) — Simultaneous same-word finds never reconcile who gets credit

**Scenario 2.** Both players "found" the same word via the realtime channel with no round-trip between their two `commit()` calls (i.e. neither had heard the other's broadcast yet). The board itself didn't corrupt — both ended up showing the word as found — but **each client permanently attributes the find to itself**: player A's screen says A found it, player B's screen says B found it, for the rest of the session.

**Root cause:** `mergeShared()` in `src/features/words/shared.ts:60-68`:

```ts
found: { ...incoming.found, ...local.found }
```

On a same-key conflict, the *local* value always wins over an incoming one, with no tiebreaker. Two devices that both commit before hearing each other's broadcast never reconcile — there's no shared ordering (no timestamp/revision compare, no deterministic "lower id wins" rule).

**Impact:** not board corruption, but a real, user-visible scoring bug — `myScore`/`friendScore` (`WordsGame.tsx:317-320`) can disagree between the two friends' screens for the rest of the session, and the level-complete card each of them sees states a different score for the same shared word.

**Fix direction:** give `mergeShared` a deterministic tiebreak for identical-key conflicts instead of "whoever's device is doing the merge keeps its own value" — e.g. carry a small `{ by: userId, at: serverTimestampOrRevisionCounter }` alongside each found-word entry and resolve conflicts by lowest `userId` (or earliest `at`, if a reliable shared clock/counter is threaded through the broadcast) rather than by which side is merging.

## What passed and is worth naming explicitly

- **Full two-player game** (Scenario 1): room create/join, presence sync (~450-600ms), and board convergence (~150ms) with independently-computed correct scores (1-1) — the core realtime loop works.
- **Disconnect/reconnect** (Scenario 3): closing and reopening a player's channel was observed by the other side within ~3s each way, and the reconnecting client correctly caught up on everything it missed via the `hello`/`state` replay in `useWordsRoom.ts:307-309` — no stuck/stale UI state.
- **Invalid room code** (Scenario 5): a malformed code against `game_rooms.room_code VARCHAR(6)` returns cleanly (`error: none, room: null`) in under 500ms, landing on the existing "room no longer exists" modal path — no hang, no unhandled exception.
