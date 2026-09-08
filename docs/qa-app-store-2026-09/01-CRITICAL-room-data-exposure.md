# P0 — Any room's data is readable and griefable by a stranger with no account

**Status:** confirmed live against the production database, 2026-09-08. **Not yet fixed.**
**Severity:** P0 (matches the `IOS_APP_REVIEW_AUDIT.md` scale) — real user data exposure, live right now, requires no authentication at all.
**Found by:** direct-network stress testing of the Words friend-room mode (see `03-words-mode-findings.md`), but the root cause is in tables shared by every room-based mode (classic rooms, Words, and likely Team Battle/King's lobby state) — not Words-specific.

**Scope check:** grepped every `FOR SELECT USING (true)` policy in the migration history to see whether this is a wider pattern. It isn't — the only other blanket-open SELECT policies are `category_translations` (public trivia content, no privacy concern) and TV mode's own event-log tables (`tv_answer_rejections`, `tv_phase_events`, `tv_score_events`), which are correctly open by design: TV mode has no secrecy model at all (a shared screen everyone in the room already sees), unlike a private room/Words match between two named friends. This finding is specifically about `game_rooms` and `room_participants`.

## What was confirmed, live, against production

Using a Supabase client that **never signed in at all** (no anonymous auth, no account — just the public anon key any app install ships with):

1. `select * from game_rooms` returned full rows for rooms the probe had no relationship to — host id, room code, status — **including rows unrelated to the test, i.e. real data already in the database.**
2. `select * from room_participants` returned every room's roster — nicknames, host flags, status — same unauthenticated access, same real data returned.
3. The prober could **insert itself** as a participant into a private room it was never invited to (`status: 'joined'`, no error).
4. Once self-seated, it could **update that room's `status`** column (e.g. force it to `completed`) — and, per the policy involved (see below), could have updated any other column on the row the same way.
5. For the Words mode specifically, the realtime board channel (`words-board-<roomId>`) has no membership check either: the prober could subscribe to a live game it wasn't part of, watch the real players' board state, and **inject a forged state broadcast that the real player's client accepted as authoritative** (flipped their level to a fabricated value).

No spoiler/content leak occurred (word-list content ships client-side for every level regardless of progress), so this is a pure access-control and tamper-integrity bug, not a content leak.

## Root cause

Two RLS policies, written in the very first schema migration for these tables and **never revisited since**:

```sql
-- supabase/migrations/20251226102356_a7a8b4f9-fbc9-4df4-99a1-ae012ee9ab78.sql:83-97
CREATE POLICY "Anyone can view active rooms" ON public.game_rooms
  FOR SELECT USING (true);
...
CREATE POLICY "Anyone can view room participants" ON public.room_participants
  FOR SELECT USING (true);
```

`USING (true)` with no `TO` clause means literally anyone — including a client that never authenticated — can read every row in both tables. Confirmed by grepping every migration touching these tables (78 files): these two policies are the *only* `CREATE POLICY` statements ever written for `SELECT` on either table, and neither was ever `DROP`ped or narrowed.

The reason this went unnoticed for so long: a much later migration built a real access-control model on top of these tables, and its own design comments show the team believed room secrecy already held:

```sql
-- supabase/migrations/20260922100000_public_rooms.sql:107-110 (comment on the INSERT policy)
--   you seat yourself — always in a private room, because knowing its id
--   means somebody gave you the code, and in a published one only with the
--   host's yes (their approval, their invitation, or your own room).
```

That INSERT policy is correctly written *given* the assumption that a private room's id/code is a secret only the host handed out. The two `USING (true)` SELECT policies from nine months earlier make that assumption false: anyone can list every room's id and code without ever being invited, which is step one of the exact attack chain confirmed above (list → self-seat → the UPDATE policy below lets the self-seated stranger rewrite the room).

A second policy compounds the write side once a stranger is (wrongly) able to self-seat:

```sql
-- supabase/migrations/20260103164203_032036f1-e976-4a4a-9868-e70eeb022f5d.sql:26-40
CREATE POLICY "Participants can clear unread activity"
ON public.game_rooms
FOR UPDATE
USING ( EXISTS (SELECT 1 FROM room_participants rp WHERE rp.room_id = game_rooms.id AND rp.user_id = auth.uid()) )
WITH CHECK ( EXISTS (SELECT 1 FROM room_participants rp WHERE rp.room_id = game_rooms.id AND rp.user_id = auth.uid()) );
```

Named and intended to let a participant clear one boolean flag when they view a room, but Postgres RLS has no column-level granularity — this policy grants a full-row `UPDATE` to anyone who is (or has made themselves) a participant.

The Words realtime channel issue is a separate, smaller instance of the same class of gap: `src/features/words/useWordsRoom.ts:287-289` opens `words-board-${room.id}` as a plain (non-`private`) Realtime channel, so Supabase's broadcast authorization (RLS on `realtime.messages`) never engages — there's no server-side check that a subscriber/publisher is actually seated in that room.

## Fix

### Immediate (server-only, no client release needed) — recommend applying this now, independent of the rest of this QA pass

This is a pure RLS change: no app code changes, nothing to rebuild or resubmit, and per `AGENTS.md` §4a it goes through the same path as any other schema change here — paste it into Lovable's SQL editor (or land it as a migration on `main` and ask Lovable to deploy). Given this is a live data exposure rather than a pre-launch checklist item, it's worth doing before waiting on anything else in this report.

```sql
-- Narrow room visibility to the people who actually belong in a room.
-- Replaces the two USING (true) policies from
-- 20251226102356_a7a8b4f9-fbc9-4df4-99a1-ae012ee9ab78.sql, which were never
-- revisited even after 20260922100000_public_rooms.sql built a
-- "the room id is the permission" model on top of them for private rooms —
-- a model that only holds if room ids/codes aren't independently readable
-- by everyone, which these policies defeated.
--
-- is_public rooms stay visible by row (the Discover/public listing already
-- goes through the separate public_rooms() SECURITY DEFINER RPC, but there
-- is no reason to also forbid a direct row read of a room its host chose to
-- publish).

DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.game_rooms;
CREATE POLICY "Rooms are visible to their host, their participants, or if published"
ON public.game_rooms
FOR SELECT
USING (
  host_user_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.room_participants rp
     WHERE rp.room_id = game_rooms.id AND rp.user_id = auth.uid()
  )
);

-- room_participants (the roster) has no equivalent reason to be public even
-- for a published room — only the host and the room's own participants need
-- to see who's seated.
DROP POLICY IF EXISTS "Anyone can view room participants" ON public.room_participants;
CREATE POLICY "Room rosters are visible to that room's host and its own participants"
ON public.room_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
     WHERE gr.id = room_participants.room_id AND gr.host_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.room_participants me
     WHERE me.room_id = room_participants.room_id AND me.user_id = auth.uid()
  )
);
```

Checked before recommending this: grepped every client call site of `.from("game_rooms")`/`.from("room_participants")` — every direct table read in the app (`TeamBattleContext.tsx:671`, `roomVisibility.ts`, `TeamV2.tsx:598`, the notifications panels) fetches a room the caller already has a reason to know about (their own room by id, a schema-probe `limit(1)`, etc.); nothing depends on being able to read an arbitrary stranger's room. The public Discover listing goes through `public_rooms()`, a separate `SECURITY DEFINER` function that bypasses RLS entirely, so it's unaffected by this change. This narrowing should not break any existing legitimate flow — but treat that as "should," not "definitely," until it's actually applied and the app is smoke-tested (create a room, join by invite code, browse Discover, all as different accounts) — a Supabase RLS change is exactly the kind of thing worth a manual pass before calling it done, per the "money and entitlements" caution in `AGENTS.md`.

### Also worth doing, slightly lower urgency (defense in depth + closes the write side properly)

- Narrow `"Participants can clear unread activity"` to only touch the one column it's named for, e.g. rewrite it as a `SECURITY DEFINER` RPC (`mark_room_activity_read(room_id)`) that does `UPDATE game_rooms SET has_unread_activity = false WHERE id = ... AND EXISTS (participant check)`, and drop the blanket `FOR UPDATE` policy. RLS has no column-level restriction, so "let a participant clear one flag" cannot be expressed as a table policy without also granting the rest of the row.
- Convert `words-board-${room.id}` (and the sibling `words-seats-${room.id}`) to Supabase **private** Realtime channels, backed by an RLS policy on `realtime.messages` scoped to actual `room_participants` membership, so the fix above (which stops row-discovery) is backed up by a broadcast-layer check too rather than relying on room ids being hard to guess.

## Suggested regression coverage

None of `supabase/tests/04-room-rounds.sql`, `05-invite-links.sql`, or `13-public-rooms.sql` currently asserts that an unauthenticated or unrelated caller **cannot `SELECT`** from `game_rooms`/`room_participants` for a room they don't belong to — they test the write/RPC side, not raw table visibility. Worth adding an assertion in this family (e.g. a `14-...` or extending `13-public-rooms.sql`) that runs a `SELECT` as a role with no membership and expects zero rows for a private room, mirroring the pattern `08-money-not-anon.sql` already uses for confirming a grant is actually revoked rather than assumed.
