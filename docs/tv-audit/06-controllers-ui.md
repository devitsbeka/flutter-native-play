# TV Audit — 06: Phone Controllers UI

_Scope: host controller (/tv/host/:sessionId), player controller (TVJoin),
answer UX, rejoin/invalid-state recovery, end-game, idle handling._

## Host controller (TVHostController, 1507 lines)

Renders per phase (own switch, Controller* components + TVGameOverScreen);
host answers via `submitAnswer` like any player; `markReady` starts next
round from round-intro; `startNextRound` from results; permanent
"თამაშის დასრულება" (end game) button; room name/icon edit; code copy;
`advanceDebug` line for diagnosis.

## Player controller (TVJoin, 151 lines)

Composite idle key `${phase}-${currentQuestionIndex}` (resets each question,
120s timeout → leave + home); invalid-state detector (in question phase
with no questions → auto refetch after 500ms → loading screen, not error);
Controller* screens per phase; ControllerCodeEntry gate until joined.

## Findings

### M-1: End game is a bare status write, no confirmation, no guard
`handleEndGame` sets `status='completed'` and navigates away — no
"are you sure?" and no host-only re-check at click time (UI is host-only
but the write isn't CAS'd). A mis-tap ends the game for everyone
irrecoverably (players see results). Also it doesn't stop the engine
loops explicitly (relies on unmount). Fix direction: confirm dialog +
leave the loops cleanly.

### M-2: Host is both engine AND a player
The host controller calls `submitAnswer` and runs every advance/timer/
heartbeat effect. A slow host device now competes render time between
its own answer UI and the engine — and every engine weakness (M-3 in the
question-loop doc) is a host-device weakness. Reinforces the TV-as-engine
recommendation; no isolated fix.

### M-3: Invalid-state refetch is a fixed 500ms single shot
TVJoin recovers "in question, no questions" with ONE refetch after 500ms.
If that refetch also misses (the very condition it's recovering from), the
player is stuck on the loading screen until the next phase change or idle
timeout. Should retry with backoff, or lean on the 1s poller (which now
exists but this predates it).

### M-4: 120s idle timeout can fire mid-game
The idle key resets per question, but a long reveal/round-intro or a
genuinely slow question (players thinking) approaching 120s with no phase/
index change would evict the player to home. Unlikely at 15s/question, but
the poll phases (30s+) and round-intros stack. Widen or make phase-aware.

### L-1: Two full controller screen sets
Host uses Controller* + its own layouts; player uses Controller* too, but
the host duplicates much layout inline (1507 lines). Consolidation
opportunity, not a defect.

### L-2: End-game navigates host to /team, players to results
Slight asymmetry (host leaves, players stay on results). Intended, but the
host loses the ability to "play again" without re-entering. Consider
routing host to results too.

### L-3: Room detail edit writes game_rooms directly
Host-only UI, but the write isn't ownership-checked at the DB layer — see
security run (anon can PATCH game_rooms). Cross-ref 07 S-2.
