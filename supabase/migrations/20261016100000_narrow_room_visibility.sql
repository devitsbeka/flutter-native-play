-- Room visibility was never actually private.
--
-- "Anyone can view active rooms" / "Anyone can view room participants"
-- (20251226102356_a7a8b4f9-fbc9-4df4-99a1-ae012ee9ab78.sql) are
-- FOR SELECT USING (true), with no TO clause: literally anyone, including a
-- client that never authenticated at all, can read every room and every
-- roster in the database. That was true from the very first migration for
-- these tables and was never revisited, even after 20260922100000_public_rooms.sql
-- built a real access-control model on top of it for private rooms:
--
--   you seat yourself — always in a private room, because knowing its id
--   means somebody gave you the code
--
-- That assumption only holds if a private room's id/code is actually a
-- secret nobody else can look up. It wasn't. Confirmed live: an
-- unauthenticated client could list every room (id, code, status), list
-- every room's roster (nicknames, host flags), self-seat into a private
-- room it was never invited to using nothing but the id it just read, and
-- from there rewrite the room's status via the unread-activity policy below.
--
-- Fix: a room and its roster are visible to the people who actually belong
-- there — the host, a seated participant, or (for the room row itself,
-- since a host may choose to publish it) anyone once it's public. The
-- Discover/public listing already goes through public_rooms(), a separate
-- SECURITY DEFINER function that bypasses RLS entirely, so this does not
-- affect that surface.
--
-- Checked every direct client read of these tables before writing this:
-- TeamBattleContext.tsx, roomVisibility.ts, TeamV2.tsx, and the
-- notifications panels all fetch a room the caller already has a reason to
-- know about (their own room by id, a schema-probe limit(1)) — nothing
-- depends on reading an arbitrary stranger's room, so this should not
-- break any existing legitimate flow.

-- game_rooms' own SELECT policy needs to ask "is the caller seated in this
-- room", and room_participants' SELECT policy needs to ask "is the caller
-- the host of this room" — each other's table. An inline EXISTS subquery
-- for that is evaluated through the OTHER table's own RLS policy, which
-- asks the first table's policy in turn: infinite recursion (confirmed
-- while writing this: "infinite recursion detected in policy for relation
-- game_rooms" the first time this was tried as plain subqueries). A
-- SECURITY DEFINER predicate breaks the cycle the same way
-- is_block_between() already does for friendships/game_invitations
-- (20261013110000_blocks_are_enforced.sql) — it reads the table directly as
-- its own owner, not through that table's policies, so evaluating it never
-- re-enters RLS.
--
-- Deliberately takes no target-user argument — it only ever answers "is the
-- CALLER (auth.uid()) seated in this room", never "is some other user I name
-- seated in this room". A two-argument version would need EXECUTE granted to
-- anon (below) to keep working for a genuinely unauthenticated caller, and a
-- two-argument version granted to anon is directly callable as
-- `rpc('is_room_participant', {room, user})` — a membership oracle for any
-- (room, user) pair the caller can guess, which is exactly the kind of
-- disclosure this migration exists to close. Single-argument, caller-only
-- avoids that shape entirely: calling it about yourself, repeatedly, tells
-- you nothing you did not already know.
CREATE OR REPLACE FUNCTION public.is_caller_room_participant(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.room_participants rp
     WHERE rp.room_id = p_room_id AND rp.user_id = auth.uid()
  );
$$;

-- Granted to anon as well as authenticated: the whole point is that this
-- must still resolve correctly (to false, harmlessly — auth.uid() is null)
-- for a caller with no session at all, since that is exactly the caller
-- these two SELECT policies need to keep working for on a published room.
REVOKE ALL ON FUNCTION public.is_caller_room_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_caller_room_participant(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_caller_room_host(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
     WHERE gr.id = p_room_id AND gr.host_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_caller_room_host(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_caller_room_host(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view active rooms" ON public.game_rooms;
CREATE POLICY "Rooms are visible to their host, their participants, or if published"
ON public.game_rooms
FOR SELECT
USING (
  host_user_id = auth.uid()
  OR is_public = true
  OR public.is_caller_room_participant(id)
);

DROP POLICY IF EXISTS "Anyone can view room participants" ON public.room_participants;
CREATE POLICY "Room rosters are visible to that room's host and its own participants"
ON public.room_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_caller_room_host(room_id)
  OR public.is_caller_room_participant(room_id)
);

-- ── the unread-activity flag: a full-row grant for a one-column job ────────
--
-- "Participants can clear unread activity" (20260103164203_...sql) is named
-- for one boolean but RLS has no column-level restriction, so it actually
-- grants a full-row UPDATE on game_rooms to anyone seated in it — including
-- a stranger who just self-seated using the hole above. Once that hole is
-- closed, self-seating into a room you weren't invited to is already hard
-- again, but this is worth fixing properly rather than leaving a second
-- layer that only held because the first one didn't: replace the blanket
-- policy with a function that can only ever do the one thing it's named for.

DROP POLICY IF EXISTS "Participants can clear unread activity" ON public.game_rooms;

CREATE OR REPLACE FUNCTION public.mark_room_activity_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_rooms
     SET has_unread_activity = false
   WHERE id = p_room_id
     AND EXISTS (
       SELECT 1 FROM public.room_participants rp
        WHERE rp.room_id = p_room_id AND rp.user_id = auth.uid()
     );
END;
$$;

-- A SECURITY DEFINER function is granted to PUBLIC by default (CLAUDE.md
-- rule 3) — state the grants explicitly rather than trust the default.
REVOKE ALL ON FUNCTION public.mark_room_activity_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_room_activity_read(uuid) TO authenticated;
