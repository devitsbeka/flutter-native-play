# Classic multiplayer rooms — stress test findings

**Method:** direct-network testing (Node + `@supabase/supabase-js`) against the live backend, replicating the exact write-sets `src/contexts/MultiplayerContextV2.tsx` uses, with multiple concurrent simulated players. Not a browser test — see the methodology note in `00-EXECUTIVE-SUMMARY.md` for why. Harness (throwaway, not shipped): `.qa-scratch/classic-rooms-stress/` (gitignored).

## Summary

| # | Scenario | Verdict |
|---|---|---|
| 1 | Full playthrough, cumulative scoring across all participants | PASS |
| 2 | Simultaneous answer submission (different users) | PASS |
| 2b | Simultaneous answer submission (same user, retry/double-tap) | **FAIL — double-credit** |
| 3 | Same invite code, two independent strangers | PASS |
| 4 | Invalid / dead invite codes | PASS |
| 5a | `complete_room_round` called by a non-participant | PASS (rejected) |
| 5b | Direct `increment_participant_score` calls with no matching answers | **FAIL — unbounded self-credit** |
| 6 | Room capacity under concurrent joins | **FAIL — confirmed oversell** |

Three real bugs, all in scoring/capacity integrity rather than data exposure. None require a client rebuild to fix — all three are server-side (RLS/RPC) issues.

---

## Finding 1 (P2) — A duplicate/retried answer submission double-pays

**Scenario 2b.** Firing the same player's answer-submission write-set twice concurrently (simulating a network retry or a double-tap on the answer button) is not rejected: both `player_answers` inserts succeed, and the score RPC runs twice, crediting 400 points for a question worth 200.

**Root cause:** `supabase/migrations/20260126010141_701f066f-19b7-45b6-87b3-0dc982d10055.sql` changed the uniqueness constraint on `player_answers` from `UNIQUE(room_id, user_id, question_index)` to `UNIQUE(tv_session_id, user_id, question_index)`, to let TV mode's per-session answers coexist correctly. For a classic room, `tv_session_id` is always `NULL`, and Postgres treats `NULL` as distinct from every other `NULL` in a unique constraint by default — so **classic rooms have had no duplicate-answer protection since that migration landed.** TV mode was separately hardened around the same time with a `SECURITY DEFINER` RPC (`submit_tv_answer`, from `20260728220000_lock_player_answers.sql`) that classic rooms never got an equivalent of — classic rooms still write `player_answers` and call the score RPC directly from the client.

**Fix direction:** add a partial unique index scoped to classic rooms:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS player_answers_classic_room_unique
  ON public.player_answers (room_id, user_id, question_index)
  WHERE tv_session_id IS NULL;
```

This alone stops the double-insert (and by extension the double score-call becomes a no-op on the second call once it depends on the row existing). Longer-term, the more robust fix — matching what TV mode already does — is to fold answer submission and scoring into one `SECURITY DEFINER` RPC so the client can't call the scoring half independently at all (see Finding 2, which is really the same underlying gap from the other direction).

## Finding 2 (P1) — `increment_participant_score` has no per-question cap, only a per-call cap

**Scenario 5b.** A legitimately-seated participant can call `increment_participant_score(room_id, delta)` directly, repeatedly, with **zero corresponding `player_answers` rows** — i.e. claim credit for questions they never answered. Confirmed: three direct calls with `delta=275` each took a fresh test participant from 0 to 825 points with `player_answers` row count staying at 0 throughout.

**Root cause:** `supabase/migrations/20260815090000_bound_score_and_vip_powers.sql` fixed the original "send any number you like" hole by clamping the *per-call* delta to a maximum (275), but added no check that the call corresponds to an actual submitted, correct answer, and no limit on *how many times* the RPC can be called per room/game. The per-call clamp bounds how fast you can cheat, not whether you can.

**Fix direction:** make crediting transactional with the answer, the same pattern `room_first_correct` already uses to dedupe the first-answer bonus — e.g. change the RPC to accept `(room_id, question_index)` instead of a raw `delta`, look up the correct `player_answers` row itself, compute the award server-side, and no-op (or raise) if that row doesn't exist or has already been paid:

```sql
-- sketch, not a drop-in migration — the real one needs the existing
-- scoring formula (right/wrong, speed bonus, etc.) folded in
CREATE OR REPLACE FUNCTION public.increment_participant_score(p_room_id uuid, p_question_index int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answer player_answers%ROWTYPE;
BEGIN
  SELECT * INTO v_answer FROM player_answers
   WHERE room_id = p_room_id AND user_id = auth.uid() AND question_index = p_question_index
     AND tv_session_id IS NULL;
  IF NOT FOUND OR NOT v_answer.is_correct OR v_answer.scored THEN
    RETURN; -- nothing to pay, or already paid
  END IF;
  UPDATE player_answers SET scored = true WHERE id = v_answer.id;
  UPDATE room_participants SET total_score = total_score + <formula>(v_answer)
   WHERE room_id = p_room_id AND user_id = auth.uid();
END $$;
```

This also subsumes Finding 1 once in place, since the answer row itself becomes the single source of truth for whether a question was scored.

**Note on severity:** this doesn't touch real money directly, but classic-room scores feed leaderboards and (per `docs/OPERATIONS.md`) leaderboard rewards are claimed via `claim_leaderboard_reward` — so an unbounded score-inflation bug upstream of a real reward-payout RPC is worth treating as more than cosmetic, even though the reward RPC itself is separately bounded and already well-covered by `supabase/tests/`.

## Finding 3 (P2) — Room capacity is enforced client-side only; concurrent joins oversell

**Scenario 6.** A room created with `max_players=5`, hit with 8 concurrent join attempts, ended up with **7 seats filled** — 2 over the cap. The two joiners who got rejected both read a stale/lower participant count (6 and 7) moments before their own insert would have landed, proving the check-then-insert isn't atomic.

**Root cause:** `enterRoom` in `src/contexts/MultiplayerContextV2.tsx` (~line 1549) does a `SELECT count(*)` and then a separate `INSERT`, with no transaction, no row lock, and no database-level constraint tying `room_participants` row count to `game_rooms.max_players`. This is a textbook TOCTOU race, and exactly the shape of traffic a popular invite link shared into a group chat produces (several people tapping the link within the same second).

**Fix direction:** move the capacity check server-side and atomic — either:
- a `SECURITY DEFINER` "join room" RPC that does the count-check and insert inside one transaction, taking a row lock on the room (`SELECT ... FOR UPDATE` on `game_rooms` first) before counting participants, or
- a trigger on `room_participants` that raises on insert if `(SELECT count(*) FROM room_participants WHERE room_id = NEW.room_id) > (SELECT max_players FROM game_rooms WHERE id = NEW.room_id)`.

The RPC approach is preferable since it can also return a clean "room is full" error the client already knows how to show, rather than surfacing a raw trigger exception.

## What passed and is worth naming explicitly (confirms real fixes hold under load)

- **Cumulative scoring across all participants, not just the host** (Scenario 1) — this is the exact bug class `20260822120000_complete_room_round.sql` was written to fix (non-host rows silently RLS-blocked). Confirmed fixed by actually playing two full rounds with 4 concurrent finalization calls per round; exactly one call claimed each round (correct CAS behavior) and every participant's totals accumulated correctly.
- **Invite-link identity handling** (Scenario 3) — two independent anonymous identities accepting the same code each get exactly one clean seat with correct nicknames; re-accepting is idempotent.
- **Round-finalization authorization** (Scenario 5a) — a non-participant calling `complete_room_round` for a real room/game they don't belong to is cleanly rejected (`P0001 "not a participant of this room"`), and fabricated room/game ids are rejected the same way. This is the access-control half working correctly even though the payout-amount half (Finding 2) is not.
- **Dead/invalid invite codes** (Scenario 4) — fabricated codes, cancelled rooms, and already-started rooms are all rejected cleanly with no hangs or unhandled exceptions.
