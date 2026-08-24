-- Playing a game with someone makes you friends.
--
-- The host invites a player, they show up, they play a whole game together —
-- and then the host has to go and send them a friend request, which is the
-- one relationship the app already had every reason to believe in. Only the
-- personal /i/<code> link created a friendship, so anyone who arrived by a
-- room code or was added to the room by the host stayed a stranger.
--
-- This closes it at the end of the game: when a room's status becomes
-- 'completed', the host and everyone who actually played become friends.
--
-- Why the host and not everybody
-- ──────────────────────────────
-- The host invited these people; that is the relationship the game is
-- evidence of. Two guests who never chose each other and only share a host
-- are not owed a friendship, so a four-player room makes three friendships,
-- not six.
--
-- Why a trigger and not the client
-- ────────────────────────────────
-- friendships has an INSERT policy of `auth.uid() = user_id` and nothing
-- else, so a client CAN write a row naming itself — a "we are friends" that
-- is really "I have put myself in your list". Every friendship the app
-- creates without an explicit tap is written here instead, by a definer
-- function, from facts the database can see for itself: the room completed,
-- and these rows say who was in it.
--
-- What it will not do
-- ───────────────────
--  * resurrect a blocked pair — a row that exists in either direction is
--    left exactly as it is, whatever its status
--  * befriend someone who never turned up — 'invited' is the status of a
--    player the host added who has not joined, and an invitation nobody
--    accepted is not a game played together
--  * fire twice — the WHEN clause requires the status to be CHANGING to
--    completed, so a permanent room replayed a dozen times inserts nothing
--    after the first
--
-- A pending request between two people who then played is settled rather
-- than left hanging: they have just spent a game together, so the answer is
-- not in doubt.

CREATE OR REPLACE FUNCTION public.befriend_room_players()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.host_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Everyone who was actually in the room when it finished. 'invited' is
  -- excluded on purpose: that is a player the host added who never came.
  WITH played AS (
    SELECT DISTINCT rp.user_id
    FROM public.room_participants rp
    WHERE rp.room_id = NEW.id
      AND rp.user_id IS NOT NULL
      AND rp.user_id <> NEW.host_user_id
      AND rp.status IN ('joined', 'playing', 'finished')
  )
  INSERT INTO public.friendships (user_id, friend_id, status, accepted_at)
  SELECT NEW.host_user_id, played.user_id, 'accepted', now()
  FROM played
  WHERE NOT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE (f.user_id = NEW.host_user_id AND f.friend_id = played.user_id)
       OR (f.user_id = played.user_id AND f.friend_id = NEW.host_user_id)
  )
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- A request that was already outstanding between the host and someone who
  -- played is answered by the game itself. Only 'pending' — a blocked pair
  -- stays blocked.
  UPDATE public.friendships f
  SET status = 'accepted',
      accepted_at = COALESCE(f.accepted_at, now())
  WHERE f.status = 'pending'
    AND (
      (f.user_id = NEW.host_user_id AND f.friend_id IN (
        SELECT rp.user_id FROM public.room_participants rp
        WHERE rp.room_id = NEW.id AND rp.status IN ('joined', 'playing', 'finished')))
      OR
      (f.friend_id = NEW.host_user_id AND f.user_id IN (
        SELECT rp.user_id FROM public.room_participants rp
        WHERE rp.room_id = NEW.id AND rp.status IN ('joined', 'playing', 'finished')))
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.befriend_room_players() FROM public;

DROP TRIGGER IF EXISTS trigger_befriend_room_players ON public.game_rooms;
CREATE TRIGGER trigger_befriend_room_players
AFTER UPDATE OF status ON public.game_rooms
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION public.befriend_room_players();
