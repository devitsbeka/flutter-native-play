# TV Audit — 05: TV Display UI

_Scope: TVDisplay phase routing, pairing/lobby/countdown/question/reveal/
results screens, roster & zone rendering, layout, legacy surface._

## Phase routing (TVDisplay, `/tv/:code`)

pairing/waiting/lobby → PairingV3 or LobbyV2 (by `isPaired || players>0`) ·
countdown → CountdownV2 · question/playing/reveal → QuestionScreenV4 ·
round-intro → RoundIntroScreen · poll-* → PollScreen/PollResults ·
results/completed → TVResultsScreen · unknown → lobby/pairing fallback.
Wrapped in TVErrorBoundary (reload-on-error). `category-select` has no case
→ falls to lobby (acceptable: host picks on phone; TV shows lobby).

Session resolution tries THREE lookups: legacy 6-char `pairing_code`,
4-digit `tv_pairing_code`, then raw session uuid.

## Question screen (V4) — the strongest surface

One-card-per-person identity (normalized nickname), presence overlay with
DB answers fallback (event `*` + 1.2s poll), three status zones (wrong left
/ waiting center / correct right), split layout for image questions with
text fallback on image error, doubled TV text sizes (largeText), N-player
safe. Reveal = same screen with green-highlighted correct answer.

## Results screen

TVResultsScreen: presence merged with durable `tv_players` scores
(best-per-nickname), podium top-3 + grid for 4th+, spaced hint footer.

## Findings

### M-1: A second, divergent TV display stack still ships
`/tv` (TVLobby.tsx) is a PARALLEL phase router that renders its own screen
set — including **TVResultsScreenV2**, which never received the results
fixes (empty-podium fallback, spacing) applied to TVResultsScreen. It
redirects to `/tv/:sessionId` once a session id exists, so exposure is a
brief window (and any redirect failure strands users on the stale stack).
TVScoreboardScreen / TVIdleScreen / TVGameOverScreen(-on-TV) are further
showcase/legacy surfaces. Fix direction: make `/tv` a thin
create-and-redirect page with no own router; retire V2/legacy screens
(feeds the dead-code cleanup).

### M-2: Legacy 6-char `pairing_code` lookup still first in line
TVDisplay queries the deprecated `pairing_code` column before the real
4-digit code. Harmless today (column mostly null) but it's an extra query
per boot and a trap if the column ever gets reused.

### L-1: `handleStartGame` dead code in TVDisplay
Defined, never rendered (TV never starts games). Remove with cleanup.

### L-2: Reveal shows zones only as avatar badges
During reveal the TV highlights the correct option and moves avatars, but
shows no per-player answer text (who picked what). Fine for pace; noted as
a possible party-mode delight feature, not a defect.

### L-3: Double phase-mapping in TVDisplay
`mapDbStatusToPhase(phase)` is applied to an already-mapped phase —
idempotent today; would mask a future mapping bug. Trivial tidy-up.

### L-4: Error state offers "Back to Team" only
Session-not-found on a TV shows an English-only error with a link into the
app UI — on an actual TV this is a dead end. Should offer "create a new
session" instead, localized.
