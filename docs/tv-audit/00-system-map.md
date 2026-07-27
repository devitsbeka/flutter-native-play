# TV Multiplayer Audit — 00: System Map

_Audit workspace. Each run appends findings to its own file; this map is the
shared reference. Generated 2026-07-27/28 (Run 1)._

## Roles & devices

| Role | Route | Identity |
|---|---|---|
| TV display | `/tv` (TVLobby → create) → `/tv/:code` (TVDisplay) | presence key `TV_DISPLAY`, never a player, never host |
| Host controller | `/tv/host/:sessionId` (TVHostController) | playerId (see Identity below), `is_host=true`, **runs the game engine** |
| Player controller | `/join`, `/join/:code`, `/join/session/:sessionId` (TVJoin) | playerId, guest or authenticated |
| Mirror | TVMirrorModal | presence key `TV_MIRROR`, system device |

## Identity

- `getOrCreatePlayerId(userId?)`: **authenticated users → auth uid**; guests →
  `crypto.randomUUID()` persisted in localStorage `tv_guest_player_id`.
  Both are uuid-format (RPC depends on this).
- Per-session join idempotency: localStorage `tv_session_binding_<sessionId>`
  (24h expiry, matches session `expires_at`).
- Person identity on displays = normalized nickname (rebind-safe); unique
  nicknames enforced at join (suffix " 2").

## State machine (tv_sessions.status → client phase)

`waiting→pairing`, `paired/lobby→lobby`, `countdown`, `playing/question→question`,
`reveal`, `completed/results→results`, plus `round-intro`, `category-select`,
`poll-suggest/voting/results`.

Transitions written by: host client (advanceToReveal CAS, reveal→next CAS,
round start), **DB RPC `submit_tv_answer`** (question→reveal on all-answered,
exactly-once), timer expiry (host, CAS-guarded).

## Database

- `tv_sessions` — session row; `questions` JSONB (all 10 upfront, ~7KB);
  `current_question_index`, `question_start_time`, `reveal_start_time`,
  `active_player_count`, `current_round_suggester_*`, `room_id` (nullable
  link to game_rooms), `expires_at` (+24h).
- `tv_players` — roster; `player_id` text, `user_id` (auth, nullable),
  `is_host`, `is_active`, `current_round_score` (accumulates across rounds).
- `player_answers` — TV rows keyed `(tv_session_id, user_id uuid, question_index)`
  UNIQUE; `room_id` nullable (since 20260728); wiped by prepareForPlaying
  before every question.
- `tv_session_queue` / `room_category_queue` — multi-round queues.
- `tv_round_history` — per-round scores archive.
- RPC `submit_tv_answer` (SECURITY DEFINER): row-lock → stale-tap validation
  → upsert answer → all-answered (expected active ids ⊆ answered ids) →
  CAS transition to reveal. Verified end-to-end 2026-07-27.

## Realtime channels (per device)

| Channel | Kind | Consumer |
|---|---|---|
| `tv-session-{id}` | postgres_changes UPDATE on tv_sessions | all |
| `tv-presence-{id}` | presence (key=playerId) | all; display accelerator only |
| `tv-roster-{id}` | postgres_changes on tv_players | TVQuestionScreenV4 |
| `tv-q-answers-{id}-{q}` | postgres_changes * on player_answers | TV display (per question, churns) |
| `room_participants_{roomId}` | postgres_changes | TV lobby invited cards |

## Polling / timers (the guarantees)

- 1s session poller (all devices; host index-ahead only) → resync via refetchSessionData
- 1.2s TV answers poll (per question)
- 1.5s host advance check (checkAndAdvanceIfAllAnswered)
- 5s host heartbeat (force-advance at +10s/+5s overdue)
- Reveal: short 1.4s default; 10s only on DB-confirmed zero answers; 14s watchdog
- FreshBuildGuard: 45s build check, reloads unless `window.__liveGameActive`
- Screen wake lock during active phases

## Key client files

- `src/contexts/TVGameContext.tsx` (~3.7k lines — the engine)
- `src/pages/TVDisplay.tsx`, `TVHostController.tsx`, `TVJoin.tsx`, `TVLobby.tsx`
- `src/components/tv/*` (screens per phase; V2/V4 = current, V1s legacy)
- `src/utils/tvScoring.ts` (bindings, scoring), `src/services/questionService.ts`
- `supabase/migrations/20260727160000`, `20260728000000` (RPC)

## Audit run index

- [x] 01 lifecycle
- [x] 02 game start & rounds
- [ ] 03 question loop
- [ ] 04 realtime & sync resilience
- [ ] 05 TV display UI
- [ ] 06 controllers UI
- [ ] 07 database & security
- [ ] 08 synthesis & fix backlog
