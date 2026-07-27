# TV Audit — 08: Synthesis & Prioritized Fix Backlog

_45 findings across 7 runs, ranked into an execution order. Effort: S(<1h)
M(hours) L(day+). Each item cites its source run (`0X:ID`)._

## The one root cause behind most of it

TV mode's history of "fine then stuck" traces to **the host's phone being
the single game engine.** Runs 3/4/6 all point back to it (03:M-3, 06:M-2).
Everything else is either a symptom, a compensating layer, or unrelated
polish/security. The strategic question the backlog is built around: **keep
patching the phone-engine, or move the engine to the TV/server.**

## TIER 0 — Security (do first; users' data is exposed today)

| # | Item | Effort | Dep |
|---|---|---|---|
| 0.1 | **S-1** Stop exposing `security_answer_hash`/coins/gems/referral to anon on `profiles` (view or column privileges) | M | DB access |
| 0.2 | **S-2** Lock UPDATE/DELETE on tv_sessions/tv_players/game_rooms to owner/host/self; route state writes through RPCs only | L | DB access |
| 0.3 | **S-3** Restrict `player_answers` writes to the RPC once RPC proven sole path | M | 0.2, RPC-only |
| 0.4 | **S-4** Zombie tv_session cleanup (no presence N min → completed) | M | edge fn |

Prereq for all of Tier 0: **DB ownership + a real migration pipeline** (DB
is Lovable-managed; migrations aren't auto-applied — proven this week). Do
NOT use Lovable's bulk "fix all." Fix per-item, test multiplayer after each.

## TIER 1 — Correctness bugs live for users right now

| # | Item | Effort | Src |
|---|---|---|---|
| 1.1 | **Observer bonus broken** on RPC-transitioned questions — move bonus into the RPC or run on reveal entry regardless of transitioner | M | 03:M-1 |
| 1.2 | **Host assignment race** — CAS `host_user_id` (`WHERE host_user_id IS NULL`) + re-read | S | 01:H-1 |
| 1.3 | **startGame double-invocation guard** (in-flight ref + disable button); auto-start vs manual race | S | 02:M-2 |
| 1.4 | **End-game confirmation** dialog + clean loop teardown | S | 06:M-1 |
| 1.5 | **Mid-question quitter** stalls to timer — clamp expected set to recently-present, or grace-period deactivate | M | 03:M-2 |
| 1.6 | **4-digit code uniqueness** at create (retry vs active sessions) | S | 01:M-1 |

## TIER 2 — Resilience hardening

| # | Item | Effort | Src |
|---|---|---|---|
| 2.1 | Channel-status recovery: re-create channels on CHANNEL_ERROR/TIMED_OUT with backoff | M | 04:M-1 |
| 2.2 | Invalid-state refetch → retry/backoff (or lean on 1s poller) | S | 06:M-3 |
| 2.3 | Single session-scoped answers channel (kill per-question churn) | M | 04:M-2 |
| 2.4 | Poll phases: watchdog + strand recovery (same class as question loop) | M | 02:M-4 |
| 2.5 | Lobby count/auto-start DB fallback | S | 04:M-3 |
| 2.6 | Idle timeout phase-aware (don't evict during polls/round-intro) | S | 06:M-4 |

## TIER 3 — Dead code & drift removal (bundle + bug-surface reduction)

| # | Item | Effort | Src |
|---|---|---|---|
| 3.1 | Retire the parallel `/tv` (TVLobby) display stack + TVResultsScreenV2 → thin create-and-redirect | M | 05:M-1 |
| 3.2 | Remove legacy 6-char `pairing_code` lookup + dead `handleStartGame` + double phase-map | S | 05:M-2,L1,L3 |
| 3.3 | Wire up or delete `saveRoundHistory`/`tv_round_history` | S | 02:M-3 |
| 3.4 | Legacy V1 screens, TVLobby/TVJoin dupes, controller layout dupes | M | 01:L-3, 06:L-1 |
| 3.5 | User-trivia rounds: carry media + image validation | M | 02:M-1 |

## TIER 4 — Polish & product decisions

Localized TV error with "new session" (05:L-4) · per-player answer text on
reveal (05:L-2) · rename `current_round_score`→`total_score` (02:L-3) ·
server-side seen-question tracking (02:L-1) · decide auth-user-two-devices
rule (01:M-2) · host→results on end-game (06:L-2).

## THE STRATEGIC FORK (decide before Tier 1 grows further)

**Option A — TV/server becomes the engine.** The TV (plugged in, never
sleeps) or a DB scheduler owns timing + transitions; phones only submit.
Kills 03:M-3, 06:M-2, and the whole "host phone froze" family at the root.
Effort L (multi-session), highest payoff. The atomic RPC already proves the
pattern (DB owns the all-answered transition) — extend it to timer-driven
advance and reveal exit, and the host phone stops being load-bearing.

**Option B — keep patching the phone engine.** Tier 1/2 items make it more
robust but 03:M-3 (host closes app mid-reveal → strand) is unfixable
without a non-phone actor. Watchdogs cap it; they can't remove it.

**Recommendation:** Tier 0 (security) immediately — it's unrelated to the
fork and users are exposed now. Then decide the fork BEFORE spending more on
Tier 1, because Option A absorbs several Tier 1/2 items (1.1, 1.5, 2.4) for
free. If Option A is chosen, re-scope Tier 1 around it.

## Execution notes
- Everything Tier 0 and the DB half of others needs the ownership/pipeline
  prereq — resolve that first or fixes can't ship reliably.
- Each fix = its own small PR, verified (tsc + eslint parity + build) and,
  where DB-facing, a live probe before/after like the RPC verification.
- Re-run the relevant audit file's probes after each fix to confirm closure.
