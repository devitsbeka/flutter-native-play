# TV mode — stress test findings

**Method:** direct-network testing (Node + `@supabase/supabase-js`) against the live backend, replicating the exact request shapes `src/contexts/TVGameContext.tsx` sends. Harness (throwaway, not shipped): `.qa-scratch/tv-stress/` (gitignored). One necessary deviation from a pure guest simulation: since Finding 1 below proves a genuine anonymous guest currently cannot host at all, the harness used Supabase's own `signInAnonymously()` purely as a *test tool* to get a JWT so the rest of the question loop could be exercised — the real app never does this for TV hosting (confirmed absent from `TVGameContext.tsx`/`ControllerCodeEntry.tsx`/`GuestJoinModal.tsx`).

## Summary

| # | Scenario | Verdict |
|---|---|---|
| — | Foundational: can a guest actually host a game? | **P0 — FAIL, confirmed** |
| 1 | Basic full playthrough | PASS (+ P3 concern: no first-answer bonus in TV mode) |
| 2 | Simultaneous answer race | PASS |
| 3 | Late join mid-question | **P2 — CONCERN, reactivation path is dead code** |
| 4 | Duplicate/replay answer submission | PASS |
| 5 | Duplicate nickname / rejoin | PASS |
| 6 | Bad/expired/nonexistent code | **P1 — FAIL, live infinite-spinner hang reproduced** |
| 7 | Round-advance race | PASS |
| 8 | Anonymous-write abuse probe | **P0 — FAIL, two confirmed exploits + a self-heal correctness bug** |

---

## Finding 1 (P0) — A guest cannot actually host a TV game; it fails silently and gets permanently stuck

This directly undermines the app's own stated review strategy: `docs/OPERATIONS.md` §5 lists as a submission checklist item *"guest mode means no demo account is needed — say so outright... how a single reviewer can test multiplayer."* If a reviewer (or any real guest) tries to host TV mode without signing in, this is what actually happens right now.

`ControllerCodeEntry.tsx` + `GuestJoinModal.tsx` let an unauthenticated guest join a code, and `joinSession` (`TVGameContext.tsx` ~2182-2193) makes the *first* joiner of an unclaimed session the host purely from local client state (`!session.host_user_id`) — no server check that this actually succeeded. But `supabase/migrations/20260728120000_block_anon_session_writes.sql` did `REVOKE UPDATE ON public.tv_sessions FROM anon`, encoding the product rule "only a logged-in user can host."

**Confirmed live, with a pure anon client (no JWT beyond the public anon key):**

```
INSERT tv_sessions (...)                                      -> succeeds (the TV display itself still creates fine)
UPDATE tv_sessions SET host_user_id=..., status='paired' ...   -> 42501 permission denied for table tv_sessions
```

- The host-claim update's error is **never checked** by `joinSession` — the guest's own screen shows `isHost: true` while the database still has `host_user_id: NULL`.
- That "host" then presses Start, and `startGame`'s own `tv_sessions` update (~3375-3397) hits the *same* `42501` — this one *is* error-checked, so the guest sees a bare, unexplained "couldn't start game" toast. The session is now permanently stuck: `host_user_id` stays `NULL` forever, and every subsequent joiner hits the identical silent failure.

**Files:** `src/contexts/TVGameContext.tsx` (`joinSession` ~2182-2193, `startGame` ~3375-3397); `supabase/migrations/20260728120000_block_anon_session_writes.sql`.

**Fix direction:** route the host claim through the RPC that already exists for exactly this — `tv_claim_session` (`supabase/migrations/20260728200000_tv_claim_session.sql`) — which correctly checks `auth.uid()` server-side and returns a clean `{claimed:false, reason:'not_authenticated'}` instead of a bare permission error. Gate the "become host" UI path on sign-in rather than letting the guest-join modal be reachable as the very first joiner of an unclaimed session. At minimum, check the host-claim update's error and show the guest something actionable instead of nothing.

## Finding 2 (P0) — `submit_tv_answer` trusts client-supplied points and player id, with no bound and no identity check

`submit_tv_answer` (current definition: `supabase/migrations/20260729000000_submit_answer_heals_roster.sql`) is intentionally anon-executable by design (a TV display is never signed in) — that's fine, and the SQL test suite already documents it as a deliberate exception. The problem is what's inside it: it takes `p_player_id`, `p_points`, `p_is_correct`, `p_time_remaining` as bare parameters, with **no relationship enforced between the caller and `p_player_id`, and no server-side recomputation or ceiling on `p_points`.**

Two exploits confirmed live, each stopped after one confirmation per the testing brief:

1. **Unbounded points.** Sent `p_points: 999_000_000, p_is_correct: true` → response `{accepted:true, player_total: 999000000}`, and the DB read back the same value. (`MAX_QUESTION_POINTS` in `src/utils/scoring.ts` is 275 — a single correct answer should never be able to exceed that.)
2. **Arbitrary player-id payout.** From the attacker's own session, called `submit_tv_answer` with `p_player_id` set to a *different, real* player's id, who never made this call themselves. That victim's `current_round_score` went `0 → 5,000,000`. Nothing in the RPC ties `p_player_id` to any notion of who is actually calling.

A third attempt — submitting for a freshly-fabricated player id that never joined — was blocked, but by accident, and the block exposes a live correctness bug: the roster-self-heal path (added by the same migration specifically to recover guests whose join-time insert silently failed) writes the guest's id into `tv_players.user_id`, which has a foreign key to `auth.users(id)`. A real guest's player id (`crypto.randomUUID()`, never a row in `auth.users`) hard-fails that insert with Postgres `23503`. **This means the self-heal feature cannot work for the exact guest scenario its own migration describes fixing** — a guest whose `tv_players` row never got created would now get a hard, permanent "answer not sent" error on every retry, instead of being healed.

**Files:** `supabase/migrations/20260729000000_submit_answer_heals_roster.sql`; `supabase/migrations/20260805120000_unified_scoring_observer_bonus.sql` (the pattern that already does this correctly, see below); `src/utils/scoring.ts`.

**Fix direction:**
- Recompute `points_earned` server-side from `p_is_correct` and `p_time_remaining` using the exact formula already in `scoring.ts` (base 100 + 10/sec, clamped 0-15s) and ignore any client-supplied `p_points` entirely — this is exactly the pattern `award_tv_observer_bonus` already uses correctly (confirmed it could not be tricked the same way).
- Bind `p_player_id` to the caller. Since guests have no `auth.uid()`, the minimum viable fix is a per-session, server-issued player token (returned by a join RPC, required and verified here before any write) — the same shape `tv_claim_session`'s host-token already uses successfully.
- Fix the roster-heal insert to write the guest id into `player_id` only (as `joinSession` itself already correctly does) and leave `user_id NULL` for an unauthenticated healer, matching the column's actual nullable FK — restoring the self-heal feature to what its own migration claims it does.

## Finding 3 (P1) — Joining via a stale/expired code produces an infinite-spinner hang, not a clean failure

Most bad-code inputs (garbage strings, wrong lengths, SQL-metacharacters, a well-formed-but-nonexistent UUID, a malformed UUID) fail cleanly and fast (`session_not_found`, under 1s, no raw error surfaced). But a plausible-looking short code (`"0000"`) **actually joined a real session** — one created 2026-07-27, `expires_at` over a month in the past, `status: 'playing'`, `questions: []` (an empty leftover from an old audit probe).

The client's own `TVJoin.tsx` treats "status expects questions but there are none" as a *transient loading* state (`hasInvalidState`): it shows "loading questions... please wait" and calls `refetchSessionData()` every 500ms **forever**, because the data backing that spinner will never change for a genuinely dead session. This is a live-reproduced hang, not a hypothetical.

**Root cause:** `joinSession`'s session lookups (`TVGameContext.tsx` ~2106-2135) filter only on `status IN (...)`, with **no `expires_at` filter at all** — any session in an "active-looking" status remains joinable by its stale code for as long as the row exists. Per `docs/tv-audit/07-database-security.md` and `supabase/migrations/20260731010000_launch_hardening.sql`'s own numbers, this has historically not been rare (1170/1171 sessions were past-expiry at that migration's writing) — expiry-clearing only runs as a one-time backfill plus a write-time trigger, so a row nobody ever touches again keeps its code indefinitely. A live scan of currently-active sessions found 12 live codes with no duplicates right now, so acute collision risk has eased since that audit — but the **expired-yet-joinable** class this scenario reproduces is still wide open.

**Files:** `src/contexts/TVGameContext.tsx` (`joinSession` lookups ~2106-2135); `src/pages/TVJoin.tsx` (`hasInvalidState` handling ~60-90); `supabase/migrations/20260731010000_launch_hardening.sql`.

**Fix direction:** add `.gt('expires_at', new Date().toISOString())` to both lookup queries in `joinSession`; run the already-existing `retire_expired_tv_sessions()` on a schedule rather than as a one-time backfill. Separately, `hasInvalidState` should distinguish "waiting on realtime lag" from "this session is permanently empty" (e.g. give up after N failed refetches with a real error) instead of polling indefinitely.

## Finding 4 (P2) — A player who joins mid-question stays excluded from scoring longer than intended, because the code that would fix it no longer runs

Correct behavior confirmed: a controller joining while a question is live is inserted `is_active:false`, and the live question still transitions normally without waiting for them (harmless). The problem is the claimed recovery: the code comment says this player is "marked inactive until the next question," reading as automatic — it isn't. `is_active` stayed `false` through a full question-index advance with zero natural rejoin; it only flipped back to `true` once the player's own client explicitly called `joinSession` again (e.g. an app refresh).

**Root cause:** the only code that reactivates a present-but-inactive player from presence, `confirmActivePlayers()`, runs inside `prepareForPlaying`'s **host-client** transition path (~1861). But `supabase/migrations/20260728170000_server_advances_question.sql` moved that same reveal→next-question transition into the DB-side `tv_advance_question` RPC specifically so any device can win the race first — and that RPC does no presence reactivation at all. In practice the server RPC (polled every ~700ms by every device) wins essentially every time, making the one path that would reactivate a late joiner dead code in the common case. A late joiner who doesn't happen to trigger their own rejoin stays silently excluded for the rest of the game.

**Files:** `src/contexts/TVGameContext.tsx` (`confirmActivePlayers` ~404-462, `prepareForPlaying` ~527-618, host-side reveal-advance effect ~1795-1924); `supabase/migrations/20260728170000_server_advances_question.sql`.

**Fix direction:** move presence-based reactivation into `tv_advance_question` itself (or a lightweight function it calls), since that's the path that actually runs now.

## What passed and is worth naming explicitly

- **Simultaneous answers** (Scenario 2): 7 concurrent `submit_tv_answer` calls in one 555ms burst — the `FOR UPDATE` row lock (`20260729000000_submit_answer_heals_roster.sql`) held correctly under real concurrency, exactly one transition.
- **Duplicate/replay of the same answer** (Scenario 4): repeated identical submissions produce exactly one committed row (`ON CONFLICT DO UPDATE`), no double-scoring from a network retry. (This is separate from Finding 2's client-supplied-points problem, which is about trusting an inflated *value*, not about replay safety — replay safety itself is solid.)
- **Duplicate nickname / same-device rejoin** (Scenario 5): correctly disambiguated (`"Name"` / `"Name 2"`), and a genuine same-device rejoin updates the existing row rather than duplicating it, correctly restoring `is_active`.
- **Round-advance race** (Scenario 7): 16 concurrent `tv_advance_question` calls from 4 independent contexts (TV, host, 2 players) — advanced exactly once, zero errors, faster than any real client traffic would produce.
- **Observer bonus payout** (`award_tv_observer_bonus`, checked as part of Scenario 8): correctly computes its own payout server-side and refused to pay with no suggester present — this is the pattern Finding 2's fix should follow.

## Minor product-consistency note (P3, not a bug)

`src/utils/scoring.ts`'s own header comment claims a universal first-answer bonus ("every mode... who was first still matters"), and `FIRST_ANSWER_BONUS` is indeed applied in solo/vs-bot (`GameContext.tsx:510`) and classic rooms (`MultiplayerContextV2.tsx:2179`) — but never referenced anywhere in `TVGameContext.tsx` or its scoring re-export. TV mode currently has no first-answer bonus at all. This reads as silent drift from the stated design rather than a deliberate choice — worth a quick product decision either way, not a bug fix.

## Supplementary note found during test cleanup

Attempting to mark this run's own sessions `completed` from an unrelated, freshly-authenticated account succeeded only for the two sessions from Finding 1 (where `host_user_id` was `NULL`) and failed silently (0 rows matched) against every session with a real, authenticated host. This suggests `docs/tv-audit/07-database-security.md`'s "authenticated tampering: OPEN" line (any signed-in user can rewrite any session) may already be narrower than documented for *claimed* sessions — worth the doc's owner re-verifying and correcting, since as written it currently overstates the gap. The narrower gap that does still hold: a session with `host_user_id IS NULL` (the window before a host claims it, or any session stuck there per Finding 1) remains writable/endable by any signed-in stranger.
