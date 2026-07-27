# TV Audit — 03: The Question Loop

_Scope: timer, answer submission (RPC + fallback), every advance path and
its guards, exactly-once guarantees, reveal timing. Includes a live 5-case
re-test of `submit_tv_answer` (2026-07-28, all passing)._

## Live RPC verification (probe session)

| Case | Result |
|---|---|
| Stale-index tap (device behind) | rejected `stale_question` ✅ |
| First of two answers | accepted, no transition ✅ |
| Same player re-answers | upsert, still 1 distinct answer ✅ |
| Last player answers | `all_answered`, transition **exactly once** ✅ |
| Late valid answer during reveal | stored, **no re-transition** ✅ |

## Advance paths (complete enumeration)

| # | Path | Trigger | Guards |
|---|---|---|---|
| 1 | **DB RPC transition** | last answer commits | row lock, index+status validation, CAS |
| 2 | Host `checkAndAdvanceIfAllAnswered` | presence sync +100ms, own answer +100/150ms, 1.5s periodic | 1.5s settle window, debounce ref, distinct-id count, person-grouping, anti-cascade brake (requires ≥1 committed row), CAS via advanceToReveal |
| 3 | Timer expiry | host countdown hits 0 | phase guard, hasAdvancedRef, CAS (status+index) |
| 4 | Heartbeat recovery | question overdue +5s/+10s (DB timestamps) | resets stuck refs, CAS |
| 5 | Manual next (host button) | results→queue, else force reveal | in-flight ref, CAS |
| Reveal exit | host reveal effect | 1.4s short default; 10s ONLY on DB-confirmed zero answers; 14s watchdog; qIndex-keyed timers | CAS on reveal→next (`current_question_index = revealQIndex`) |

Exactly-once holds because every transition write is a CAS on
`status + current_question_index`; client-side refs only reduce wasted calls.

## Timer

Per-device countdown derived from server `question_start_time`, clamped to
`[0, 15]` (clock-skew safe). Host decrements locally and owns expiry. Late
joiners/rejoiners resync via refetch (clears stale locked answers).

## Findings

### M-1: Observer bonus silently died with the RPC transition
The suggester's observer bonus is computed inside `advanceToReveal` — which
no longer runs when the RPC performs the transition (the common fast path).
Suggester rounds now only award the bonus when the timer/fallback advances.
Fix direction: move observer-bonus computation into the RPC (it already
holds answers + suggester id at transition time) or run it host-side on
reveal entry regardless of who transitioned.

### M-2: Mid-question quitters stall the question to the timer
The RPC's expected set = `tv_players.is_active` rows, refreshed only at
question start (`confirmActivePlayers`). A player closing their phone
mid-question stays "expected"; remaining players wait the full 15s. The
presence leave handler deliberately doesn't deactivate during gameplay
(flicker protection). Fix direction: RPC could clamp expected to players
with a recent heartbeat, or presence-leave could deactivate after a
grace period even mid-question.

### M-3: Reveal→next remains host-device-only
The only transition with no server-side or peer fallback. Watchdogs (14s)
cap the damage, and the host sync-poller pulls a frozen host forward, but a
host who closes the app mid-reveal still strands the session until expiry
(observed repeatedly before mitigations). Durable fix = TV-as-engine or a
DB-side scheduler; tracked as the architecture decision in Run 8.

### L-1: Fallback path duplicates decision logic
When the RPC is unreachable, the legacy upsert + client checks take over —
two parallel decision systems to maintain. Once RPC reliability is proven
over a few weeks, the fallback should shrink to "store the row + retry"
with no client-side all-answered logic.

### L-2: Host answer settle window adds latency only in fallback
`checkAndAdvance` ignores the first 1.5s after question start; with the RPC
active this is irrelevant (DB decides), but in fallback mode a lightning
answer waits ~1.5–3s. Acceptable.

### L-3: Row-lock serialization under load
`FOR UPDATE` serializes concurrent submissions per session — at 8 players
worst case ~8 sequential lock acquisitions (~tens of ms each). Fine at
current scale; revisit only for much larger rooms.

## Cross-references
- Presence-derivation guards (round-aware metas, content-pick): Run 4.
- Stranded-session cleanup: Run 7 (with lifecycle M-3).
