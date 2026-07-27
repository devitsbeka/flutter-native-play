# TV Audit — 04: Realtime & Sync Resilience

_Scope: every channel/subscription, its failure mode, and its backstop;
polling; watchdogs; visibility/wake handling; build freshness. Doctrine
(hard-won this week): **DB is truth, realtime is an accelerator, polling is
the guarantee, presence is decoration.**_

## Channel-by-channel failure analysis

| Channel | Failure mode | Backstop | Verdict |
|---|---|---|---|
| `tv-session-{id}` (session updates) | silent socket death → missed transitions | 1s poller resyncs (index immediately, phase divergence for followers); host index-ahead pull | **Covered** |
| `tv-presence-{id}` | zombie metas, unordered metas, dropped tracks | round+index-aware content-pick; presence excluded from ALL decisions; DB roster + answers fallback on displays | **Covered** (display-only role) |
| `tv-q-answers-{id}-{q}` | churns per question; setup gap misses early events; upsert emits UPDATE | listens to `*`; 1.2s poll per question | **Covered** |
| `tv-roster-{id}` | missed roster changes | refetch on every event + initial fetch; presence overlay | Covered |
| `room_participants_{roomId}` | missed invite updates | refetch-on-event only (no poll) | Minor: lobby-only cosmetic |

## Polling & guards inventory

1s session poll (all devices) · 1.2s answers poll (TV) · 1.5s host advance
check · 5s heartbeat (+5s/+10s overdue recovery) · reveal watchdog 14s ·
45s FreshBuildGuard (reloads unless `window.__liveGameActive`) · wake lock
during active phases · visibility handler (refetch + re-track + timer sync)
· stale-tap guard on follower submits (fresh 1s snapshot, zero latency).

## Findings

### M-1: No channel-status recovery (subscribe errors ignored)
No `.subscribe(status => ...)` handler reacts to `CHANNEL_ERROR`/`TIMED_OUT`
anywhere — a channel that fails to (re)establish is never re-created for the
life of the page. Polling keeps the GAME correct, but presence-driven UI
(lobby roster, live answer badges) degrades permanently until reload.
Fix direction: on error status, tear down and re-create the channel with
backoff; presence re-track after re-join.

### M-2: Answer-channel churn per question
`tv-q-answers-{sid}-{q}` is created/destroyed every question (~10-20
channel joins per game per TV). Each join has setup latency and its own
failure chance (mitigated by the poll). A single channel filtered on
session id with client-side index filtering (already half-implemented —
the filter checks `question_index` in the handler) would remove the churn.

### M-3: Presence lobby count is presence-only
The lobby header count and auto-start countdown key off presence
(`players.length`) with no DB fallback (unlike question/results screens).
A stale presence view in the lobby can hold auto-start with ghosts or
show wrong counts. Low impact, but inconsistent with the doctrine.

### L-1: Visibility re-track omits answeredQuestionIndex
On wake, presence is re-tracked with `hasAnswered: myAnswer != null` but no
question index — guards discard it (safe direction), yet it advertises
meaningless state. Cosmetic.

### L-2: `window.__liveGameActive` global
Pragmatic bridge between context and FreshBuildGuard; fine, but formalize
(export a subscription) if more consumers appear.

### L-3: Wake lock unsupported on iOS < 16.4
Silent no-op there; the stale-tap guard + poller carry those devices.

### L-4: Build-guard reload loop risk is handled
`staleDetected` resets when hashes match; a CDN serving alternating HTML
versions could still flap reloads outside games — worth a max-reloads
counter if ever observed.
