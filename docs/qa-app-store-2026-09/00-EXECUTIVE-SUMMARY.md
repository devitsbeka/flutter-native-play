# QA / stress-testing pass ahead of App Store resubmission — 2026-09-08

Commissioned as an independent pre-launch QA pass: run the app's real functionality and multiplayer modes under actual concurrent load, re-verify App Store readiness against current code, and hand back actionable findings — not fix them yet. **Nothing in this pass has been fixed.** Every file below is written so the fix can be picked up and done in one sitting once you say to start.

## Methodology note (read this before the findings — it explains why there's no video/screenshot evidence)

The original ask was to test multiplayer by driving real URLs with real player sessions, the way a QA agency would. That's what happened, but not through a browser: this sandbox's headless Chromium cannot complete a TLS connection to the live Supabase project at all (confirmed — plain `curl` and Node's own `https`/`fetch` reach it in under 100ms; every Chromium configuration tried, proxied or direct, times out or gets reset mid-handshake). That's almost certainly a WAF/browser-fingerprint block specific to this sandbox's particular headless Chromium build, not something true of a real device, a real browser, or CI (the existing Playwright suite ran fine there).

So testing was done one layer down: driving the exact same Supabase REST/RPC/Realtime calls the app's own React code makes, from Node, with multiple concurrent simulated players — using the app's real, already-built guest/anonymous-join mechanisms (invite links, TV join codes) rather than adding any login bypass to the app itself. No code in this repo was changed to make this possible, and nothing here weakens the app's authentication. If anything, this method found more concurrency bugs than a browser-driven test would have, since firing exact concurrent RPC calls is easier to control precisely than coordinating multiple real browser tabs.

All test traffic went against the **real, only** backend (there's no separate staging environment — see `AGENTS.md` §4a) using clearly tagged, disposable identities (`qa_<mode>_<runId>_...`). This is a pre-launch app with $0 revenue and no public release yet, so real-user impact was minimal, but the test data itself is real rows in the real database — see each finding's file for what was created. Nothing that could touch real money (IAP/Stripe/RevenueCat/VIP-grant flows) was touched.

## Priority action list

### Do now, independent of everything else below (live, actively exploitable, zero cost to fix)

1. **[P0] Any room's data is world-readable, and a room can be griefed by a stranger with no account.** `game_rooms`/`room_participants` have had `SELECT USING (true)` policies since the very first migration, never narrowed even after later work built a "the room id is the secret" security model on top of them. Confirmed live: reading other people's real room/roster data with zero authentication, self-seating into a private room, rewriting its status, and forging a live Words game's state to another player. **Pure server-side RLS fix, no app rebuild needed** — ready-to-paste SQL is in `01-CRITICAL-room-data-exposure.md`.
2. **[P0] `submit_tv_answer` will pay out any amount, to any player, on request.** No caller-identity check and no server-side recomputation of points. Confirmed live: crediting one player 999,000,000 points, and crediting a *different, real* player 5,000,000 points from an attacker's own session. Full detail and fix direction (bind the payout to a per-session token, recompute points server-side) in `06-tv-mode-findings.md`, Finding 2.

### Fix before resubmission (functional, not just security)

3. **[P0] A guest cannot actually host a TV game — it fails silently and the session gets stuck forever.** This directly undermines `docs/OPERATIONS.md`'s own submission checklist item about a reviewer being able to test multiplayer without an account. `06-tv-mode-findings.md`, Finding 1.
4. **[P1] Joining TV mode with a stale/expired code produces a real infinite-loading hang**, not a clean error — live-reproduced, not hypothetical. `06-tv-mode-findings.md`, Finding 3.
5. **[P1] Classic-room capacity is a client-side check only** — concurrent joins (exactly what a shared invite link produces) oversold a 5-seat room to 7. `02-classic-rooms-findings.md`, Finding 3.

### Worth fixing, lower urgency (game-integrity, not security or crashes)

6. **[P1] `increment_participant_score` (classic rooms) has no per-question cap** — a legitimate participant can call it directly and credit themselves points for questions they never answered. `02-classic-rooms-findings.md`, Finding 2.
7. **[P2] A duplicate/retried answer submission in classic rooms double-pays** — the unique constraint that used to prevent this was narrowed for TV mode's benefit and never restored for classic rooms. `02-classic-rooms-findings.md`, Finding 1.
8. **[P2] TV mode: a player who joins mid-question can stay excluded from scoring for the rest of the game** — the recovery path that's supposed to fix this is dead code under the current server-side round-advance design. `06-tv-mode-findings.md`, Finding 4.
9. **[P2] Words: two friends finding the same word at the same instant permanently disagree on who gets credit** — no tiebreaker in the client-side merge. `03-words-mode-findings.md`.
10. **[P2] TV mode's self-heal-a-missing-player-row feature cannot actually work for a real guest** — it hits a foreign-key constraint that only an authenticated user's id would satisfy. `06-tv-mode-findings.md`, Finding 2 (third bullet).

### Housekeeping (no user-facing risk, but worth doing)

11. **[P3] A real money-adjacent SQL test (`supabase/tests/15-room-pot.sql`) exists, passes, but was never wired into `pr-checks.yml`.** `05-baseline-test-suite.md`.
12. **[P3] `npm run lint` has never been a CI gate** and currently has 515 pre-existing errors — decide whether to start enforcing it. `05-baseline-test-suite.md`.
13. **[P3] TV mode has silently drifted from having a first-answer bonus**, unlike the other two scored modes — a product decision, not a bug. `06-tv-mode-findings.md`.
14. **[P4] One live, revenue-relevant question this environment cannot settle:** whether the deployed checkout backend's trial/tier logic actually matches what's on `main` right now. Needs a human with Lovable/Stripe access, or the SQL checks already written in `docs/IOS_APP_REVIEW_AUDIT.md`'s F-3 section. `04-app-store-readiness-reaudit.md`.

## What's already in good shape (confirmed by actually re-running everything, not by re-reading old docs)

- **The App Tracking Transparency fix — the actual cause of the build-34 rejection — is solid**, and now has a second regression test guarding a real near-miss that happened after the original fix. See `04-app-store-readiness-reaudit.md`.
- **The video byte-range fix is confirmed live in production**, not just "should work" — verified with a real `Range` request against `mytrivia.io`.
- **A PostHog pre-consent-capture gap both existing audit docs still list as open is actually already fixed** — worth updating those docs so nobody re-investigates a closed item.
- **2,346 unit tests pass, typecheck is clean, and the full SQL entitlement/economy suite (14 CI-gated files plus one that should be) passes against a from-scratch database** built from the real migration history. The protections around money and entitlements that `AGENTS.md` describes are, on the whole, working as designed — the P0/P1 findings above are about game-room privacy and in-game scoring integrity, not about anyone granting themselves real currency or a subscription.
- **Classic rooms' core scoring-across-all-participants bug (the historical "0 points for everyone but the host" issue) is confirmed fixed** by actually playing games through with concurrent finalization calls, not just by reading the migration that claims to fix it.
- **Round-advance and answer-submission concurrency in TV mode hold up correctly** under real concurrent load in every scenario except the two identity/payout-trust issues above.

## Files in this pass

| File | Covers |
|---|---|
| `01-CRITICAL-room-data-exposure.md` | P0 — cross-cutting room privacy/RLS issue, with ready-to-paste fix SQL |
| `02-classic-rooms-findings.md` | Classic multiplayer rooms: scoring, capacity, invite-code handling |
| `03-words-mode-findings.md` | Words friend-vs-friend mode: realtime sync, merge conflicts |
| `04-app-store-readiness-reaudit.md` | Fresh re-verification of every item in the existing iOS review audit docs |
| `05-baseline-test-suite.md` | Full run of typecheck/unit/SQL/build/e2e, mirroring CI exactly |
| `06-tv-mode-findings.md` | TV/Kahoot-style mode: guest hosting, payout trust, join/expiry handling |

## What this pass did not cover

- **Team Battle and King** — both are dark-launched behind an admin-only developer flag and a server `is_live` gate not yet flipped on, per `src/game-types/registry.ts`. They already have the most thorough SQL-level test coverage in the whole repo (`supabase/tests/10-team-battle.sql`, `11-king.sql` — full matches played through the public RPCs, all passing per the baseline run), so this pass didn't duplicate that; a live multiplayer stress pass on these two would be worth doing once they're closer to launch.
- **Real device / TestFlight / App Store Connect console verification** — sandbox purchase-and-restore, push notifications, App Privacy labels, the actual IAP catalog attached to a version. None of this is checkable without a Mac, a physical iPhone, and console access; see `04-app-store-readiness-reaudit.md` for the exact list.
- **A live purchase through the deployed Stripe/RevenueCat checkout** — deliberately not attempted (would have cost real money and left a real subscription/payment record); see item 14 above.
