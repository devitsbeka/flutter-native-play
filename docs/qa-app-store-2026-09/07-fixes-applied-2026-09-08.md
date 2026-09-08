# Fixes applied — 2026-09-08

Implements the priority list in `00-EXECUTIVE-SUMMARY.md`: both P0s, both P1s, and three of the P2s. Nothing here is deployed yet — **read "What still has to happen" at the bottom before treating any of this as fixed in production.**

## What changed

| Area | Files |
|---|---|
| Room visibility (P0) | `supabase/migrations/20261016100000_narrow_room_visibility.sql`, `supabase/tests/16-room-visibility.sql`, `src/components/team/MyRoomsSection.tsx` |
| TV mode answer binding + scoring (P0), expired-code hang (P1), late-join reactivation (P2) | `supabase/migrations/20261016130000_tv_answer_bound_and_verified.sql`, `supabase/tests/18-tv-answer-integrity.sql`, `src/contexts/TVGameContext.tsx`, `src/pages/TVJoin.tsx` |
| Classic rooms: capacity race (P1), unbounded self-credit (P1), duplicate-answer double-pay (P2) | `supabase/migrations/20261016120000_classic_room_integrity.sql`, `supabase/tests/17-classic-room-integrity.sql`, `src/contexts/MultiplayerContextV2.tsx` |
| Words merge-conflict tiebreak (P2) | `src/features/words/shared.ts`, `src/__tests__/wordsShared.test.ts` |
| CI | `.github/workflows/pr-checks.yml` — wires up the three new test files above plus `15-room-pot.sql`, which existed but was never wired in |
| Housekeeping | `supabase/tests/02-assertions.sql` — its stale `increment_participant_score` clamp assertions were rewritten for the new signature; equivalent (stronger) coverage now lives in `17-classic-room-integrity.sql` |

## Room visibility (P0)

`game_rooms`/`room_participants` SELECT policies narrowed to host/participant/(is_public for the room row only). The "clear unread activity" full-row UPDATE policy is replaced by `mark_room_activity_read(room_id)`, which can only ever touch that one column. Two new `SECURITY DEFINER` helpers, `is_caller_room_participant`/`is_caller_room_host`, break the mutual-recursion RLS would otherwise hit (each table's policy needs to ask the other table a question) — they deliberately take no target-user argument, so they cannot be used as a membership oracle for an arbitrary (room, user) pair the way a naive two-argument version could.

Not done in this pass, flagged in `01-CRITICAL-room-data-exposure.md` as worth doing next: converting Words' `words-board-*`/`words-seats-*` realtime channels to Supabase "private" channels backed by RLS on `realtime.messages`. The table-level fix above already closes the reported exploit chain (list → self-seat → rewrite), so this is defense-in-depth, not left half-fixed.

## TV mode (P0 × 2, P1, P2)

- **`submit_tv_answer`** now recomputes `is_correct`/`points` itself from the question's own `correct_answer` and the formula every other mode uses (`100 + secondsRemaining×10`), ignoring the client's claims. A guest player_id (no `auth.uid()`) must present `tv_players.answer_token`, established trust-on-first-use and stored client-side (`getOrCreateAnswerToken`, mirrors the existing `getOrCreatePlayerId` pattern); a signed-in caller is simply required to match their own `auth.uid()`, no token needed. The roster-self-heal insert now writes `auth.uid()` (null for a guest) into `user_id` instead of the untrusted `player_id` cast, which used to hard-fail on the `auth.users` foreign key for exactly the guest case the self-heal exists for.
- **Guest hosting**: `joinSession`'s host-claim now goes through `tv_claim_session` (already existed, already correct — it just wasn't being called) instead of a raw `UPDATE` the DB has revoked from `anon` since `20260728120000_block_anon_session_writes.sql`. The real bug was `isHostPlayer` being computed from the pre-claim snapshot rather than the actual outcome; a guest's screen used to show host controls for a claim the database had silently refused. It now reflects reality: a failed claim leaves `host_user_id` genuinely null, so the next signed-in joiner (which may be the same person, after signing in) can still succeed.
- **Expired-code hang**: `joinSession`'s two session lookups now exclude anything past `expires_at`. `TVJoin.tsx`'s "waiting for questions" retry loop is also bounded (10 attempts) with a real error screen instead of polling forever, as defense in depth for whatever else could leave that state permanently empty.
- **Late-join reactivation**: `tv_advance_question` now reactivates any `is_active = false` player the moment a new question actually starts, since that RPC — not the host's phone — is what performs this transition in practice.

## Classic rooms (P1 × 2, P2)

- **Capacity**: new `join_classic_room` RPC takes a row lock on the room before counting participants and inserting, replacing `enterRoom`'s non-atomic count-then-insert. Verified with genuine concurrent connections (10 real simultaneous joins against a 5-seat room → exactly 5 succeeded).
- **Unbounded self-credit**: `increment_participant_score` changed from `(room, delta)` to `(room, question_index)` — it looks up the caller's own `player_answers` row and computes the award itself; a call with no matching correct, unscored answer is a silent no-op, not a payout. A second RPC, `award_room_observer_bonus`, was split out for the one other legitimate caller of the old signature (host-observer bonus), with the same clamp plus a new host+observer authorization check the original didn't have.
- **Duplicate answer double-pay**: partial unique index on `player_answers (room_id, user_id, question_index) WHERE tv_session_id IS NULL`.

## Words (P2)

`mergeShared()`'s `found`/`bonus` maps used "local always wins" on a same-key conflict, so two friends finding the same word at the same instant permanently disagreed about who got credit. Fixed with a deterministic tiebreak (lower user id wins) that both sides compute identically, so `mergeShared(a, b)` and `mergeShared(b, a)` now always converge on the same winner.

## Verification performed

- Every fix has focused SQL regression coverage (`16`, `17`, `18`) run against a disposable local Postgres built from this repo's actual migration history (`00-supabase-shim.sql` + all of `supabase/migrations/*.sql`), plus the **entire pre-existing SQL suite re-run alongside them** — all 18 files pass together, using the exact commands now in `pr-checks.yml`.
- `npm run typecheck` — clean.
- `npm run test` (vitest) — 2348/2348 passing, 222 files.
- `npm run build` — clean (same pre-existing chunk-size advisory as before, unrelated).
- `npm run test:e2e` (Playwright, against the fresh build) — run as a final check.
- One genuine gap found and fixed along the way, unrelated to the vulnerabilities themselves: `tv_players.is_active` is referenced throughout the client and both TV RPCs but was never added via any committed migration — it exists on the live database (added directly at some point, outside the migration history), which made this fix impossible to verify locally until `20261016130000_tv_answer_bound_and_verified.sql` added it with `IF NOT EXISTS` (a no-op against the real database, which already has it).

## What still has to happen

**None of this is live.** Per `AGENTS.md` §4a, this repo's migrations deploy through Lovable, not this CI — merging this branch to `main` ships the *client* changes (Cloudflare Worker auto-deploys on push to `main`), but the three new migrations need to be applied to the actual Supabase project separately, by asking Lovable to deploy them (or pasting them into Lovable's SQL editor for the room-visibility one specifically, given its severity — see the "apply now" note in `01-CRITICAL-room-data-exposure.md`).

Until that happens, the live database still has the original, unpatched policies and functions this whole pass was about. Recommended order:
1. `20261016100000_narrow_room_visibility.sql` — the live data-exposure fix, worth applying on its own first if there's any delay getting the others reviewed.
2. `20261016130000_tv_answer_bound_and_verified.sql` and `20261016120000_classic_room_integrity.sql` — both change RPC signatures that the **client must match**, so these should deploy together with the client build that calls them (a mismatched deploy order means the old client calling the new RPC signature, or vice versa, breaks answering/scoring outright, not gracefully).

A quick way to confirm each has actually landed, once asked: the same read-only-probe pattern `AGENTS.md` already recommends — e.g., an anon-key `SELECT` against `game_rooms` for a room you're not in should return zero rows once the visibility fix is live; a `submit_tv_answer` call with an inflated `p_points` should come back with the server-computed value, not the inflated one, once the TV fix is live.
