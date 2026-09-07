-- A block has to stop the other player reaching you, not just hide them.
--
-- `user_blocks` has been written to since the moderation sheet shipped, and
-- until now it was never read anywhere that mattered: no policy, no trigger
-- and no function consulted it. So blocking someone hid nothing they could
-- still do — they carried on sending friend requests, sending game invites
-- (each of which fires a push carrying their nickname to the blocker's lock
-- screen), and turning up in every list.
--
-- The client now filters and refuses, but a client-side block is a UI
-- preference, not a block: `friendships` INSERT was `WITH CHECK (auth.uid() =
-- user_id)` and `game_invitations` INSERT was `WITH CHECK (auth.uid() =
-- sender_id)`, so anyone holding an anon key and a session could write the
-- row directly. **App Store Guideline 1.2** asks for blocking that works;
-- this is where it is made true.
--
-- Three things happen here:
--
--   1. a definer helper that answers "is this pair blocked", readable from a
--      policy without depending on user_blocks' own SELECT policies
--   2. the two INSERT policies re-created with that guard
--   3. `befriend_room_players` taught the same rule, so playing a game in the
--      same room can no longer quietly re-friend a blocked pair
--
-- Idempotent: every object is CREATE OR REPLACE or DROP-then-CREATE.

-- ---------------------------------------------------------------------------
-- 1. The predicate
-- ---------------------------------------------------------------------------
--
-- SECURITY DEFINER on purpose. A subquery inside a policy is evaluated as the
-- calling user, so an inline `SELECT ... FROM user_blocks` in a WITH CHECK
-- only sees the rows that user's own SELECT policies expose. That happens to
-- work today — "Users can check if they are blocked" makes the row naming
-- them visible — which means the guard would silently degrade into a no-op
-- the day that policy is tightened or renamed. A definer function does not
-- have that failure mode, and the answer it gives is a boolean about the
-- caller's own relationships, so it leaks nothing they could not already ask
-- for one row at a time.
--
-- Symmetric. The direction that matters is "the recipient blocked the
-- sender", but there is no legitimate flow in which someone friends or
-- invites a player *they* blocked either — the client refuses both — and a
-- symmetric rule cannot be walked around by picking the convenient end.

CREATE OR REPLACE FUNCTION public.is_block_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a IS NOT NULL
     AND b IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.user_blocks ub
       WHERE (ub.blocker_id = a AND ub.blocked_id = b)
          OR (ub.blocker_id = b AND ub.blocked_id = a)
     );
$$;

COMMENT ON FUNCTION public.is_block_between(uuid, uuid) IS
  'True when either of these two users has blocked the other. Used by the '
  'friendships and game_invitations INSERT policies and by '
  'befriend_room_players.';

-- A new SECURITY DEFINER function is granted to PUBLIC by default.
REVOKE ALL ON FUNCTION public.is_block_between(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_block_between(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_block_between(uuid, uuid) TO authenticated;

-- The unique (blocker_id, blocked_id) constraint indexes the forward
-- direction only; every lookup added here also asks the reverse.
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON public.user_blocks (blocked_id, blocker_id);

-- ---------------------------------------------------------------------------
-- 2a. friendships INSERT
-- ---------------------------------------------------------------------------
-- Was, from 20251226102356:
--   CREATE POLICY "Users can create friend requests" ON public.friendships
--     FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friendships;

CREATE POLICY "Users can create friend requests" ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_block_between(auth.uid(), friend_id)
  );

-- ---------------------------------------------------------------------------
-- 2b. game_invitations INSERT
-- ---------------------------------------------------------------------------
-- Was, from 20251226111512:
--   CREATE POLICY "Users can send invitations" ON public.game_invitations
--     FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can send invitations" ON public.game_invitations;

CREATE POLICY "Users can send invitations"
ON public.game_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND NOT public.is_block_between(auth.uid(), receiver_id)
);

-- ---------------------------------------------------------------------------
-- 3. befriend_room_players
-- ---------------------------------------------------------------------------
-- From 20260907100000, unchanged except for the two block guards. Its own
-- comment already promised it would not "resurrect a blocked pair" — it meant
-- a friendships row with status 'blocked', and said nothing about
-- `user_blocks`, so a host and a player who had blocked each other became
-- 'accepted' friends the moment their room completed. Since the function is
-- SECURITY DEFINER, this was a block being undone by a definer write the
-- blocker never made.

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
    -- Sharing a room is not consent. Someone who blocked the host — or whom
    -- the host blocked — stays a stranger, however many games the lobby put
    -- them in together.
    AND NOT public.is_block_between(NEW.host_user_id, played.user_id)
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
    )
    -- A pending request from before the block is not settled by a shared
    -- game either. It is left pending; the block filters it out of the list.
    AND NOT public.is_block_between(f.user_id, f.friend_id);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.befriend_room_players() FROM public;

-- The trigger is unchanged and still points at this function; re-created so
-- this migration is self-contained if replayed on a database that lost it.
DROP TRIGGER IF EXISTS trigger_befriend_room_players ON public.game_rooms;
CREATE TRIGGER trigger_befriend_room_players
AFTER UPDATE OF status ON public.game_rooms
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION public.befriend_room_players();
