-- A link that introduces two people.
--
-- The share row on the invite screen sent whoever tapped it to /team, or to
-- /room/<code> from a lobby. Neither carries who did the inviting, so the
-- person opening it arrived as a stranger: no name on screen, no way to end
-- up in anyone's friends list, and if they had no account they were signed
-- in silently as "Trivia King" and dropped into the room.
--
-- The link now carries a code that names its owner. Opening it shows who is
-- inviting you and what they are playing; accepting makes the two of you
-- friends.
--
-- Why a code and not the host's user id
-- ─────────────────────────────────────
-- A user id is not a secret -- every room participant can read the ids of
-- everyone else in the room. A link built from one could be constructed by
-- anybody, so "opening the link means you were invited" would be false, and
-- accepting would let a stranger put themselves in your friends list. The
-- code is random and only its owner can mint it, which is what makes sending
-- it their half of the agreement. The person opening it gives the other half
-- by accepting.
--
-- host_user_id is the column's name because the sender is usually the host of
-- what they are inviting you to. They need not be: any player in a lobby can
-- share their own link, and the room is resolved from what THEY are in.
--
-- One code per person, kept: the link a host pasted into a chat last week
-- should still work today, and it is the same link on every screen, so
-- nothing has to be minted at share time.

CREATE TABLE IF NOT EXISTS public.invite_links (
  code text PRIMARY KEY,
  host_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- Deliberately no client INSERT or UPDATE policy. Codes come from
-- get_or_create_invite_code() and nowhere else, so a client cannot choose
-- its own code -- and a chosen code is a guessable one.
--
-- Dropped first because CREATE POLICY has no IF NOT EXISTS. Everything else
-- in this file is CREATE TABLE IF NOT EXISTS or CREATE OR REPLACE, so
-- without this line one failed run leaves the file unable to be re-run:
-- the second attempt stops here with "policy already exists" before
-- reaching the functions it still has to create.
DROP POLICY IF EXISTS "Owners can read their invite code" ON public.invite_links;
CREATE POLICY "Owners can read their invite code" ON public.invite_links
  FOR SELECT USING (auth.uid() = host_user_id);


-- ── A person's own link ────────────────────────────────────────────────────
--
-- Returns the caller's code, minting one the first time. Sixteen characters
-- drawn from an alphabet with no 0/O/1/l/i in it, so a link read aloud or
-- retyped from a screenshot lands somewhere real or nowhere at all.

CREATE OR REPLACE FUNCTION public.get_or_create_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  existing text;
  candidate text;
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sign in to create an invite link';
  END IF;

  SELECT code INTO existing FROM invite_links WHERE host_user_id = caller;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  LOOP
    candidate := '';
    FOR i IN 1..16 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_links WHERE code = candidate);
  END LOOP;

  -- Two tabs can race here. The unique constraint on host_user_id settles
  -- it, and the loser takes the winner's code rather than failing.
  INSERT INTO invite_links (code, host_user_id)
  VALUES (candidate, caller)
  ON CONFLICT (host_user_id) DO NOTHING;

  SELECT code INTO existing FROM invite_links WHERE host_user_id = caller;
  RETURN existing;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_invite_code() FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_invite_code() TO authenticated;


-- ── What the person opening the link sees ─────────────────────────────────
--
-- Readable without an account, because that is the whole point: someone who
-- has never opened this app taps a link in a chat and has to be shown who
-- invited them before deciding whether to sign in at all.
--
-- Only what the invite screen draws is returned. The host's user id is
-- included because the screen needs it to tell "already friends" from "not
-- yet", and it is not a secret to someone holding the host's own link.
--
-- The room is resolved at OPEN time rather than baked into the link, so one
-- link works whether the host is in a room or not, and a link shared before
-- a room existed still lands in it.

CREATE OR REPLACE FUNCTION public.invite_preview(p_code text)
RETURNS TABLE (
  host_user_id uuid,
  host_nickname text,
  host_avatar_url text,
  host_animated_avatar_url text,
  host_country_code text,
  room_code text,
  room_name text,
  category_id text,
  category_name text,
  room_status text,
  player_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.host_user_id,
    p.nickname,
    p.avatar_url,
    p.animated_avatar_url,
    p.country_code,
    r.room_code,
    r.room_name,
    r.category_id,
    r.category_name,
    r.status::text,
    (SELECT count(*)::integer FROM room_participants rp WHERE rp.room_id = r.id)
  FROM invite_links l
  JOIN profiles p ON p.user_id = l.host_user_id
  -- The room the sender is IN, not the one they host. Anyone in a lobby can
  -- share their own link, and a guest invited by a player who is not the
  -- host must still land in that player's room -- looking up rooms they host
  -- would find a different room, or none. A host is a participant in their
  -- own room, so this covers both.
  --
  -- Waiting only. A game already under way would have the invite screen
  -- promise a seat that joining cannot give.
  LEFT JOIN LATERAL (
    SELECT gr.*
    FROM room_participants rp
    JOIN game_rooms gr ON gr.id = rp.room_id
    WHERE rp.user_id = l.host_user_id
      AND gr.status = 'waiting'
      AND gr.is_archived IS NOT TRUE
    ORDER BY gr.last_activity_at DESC NULLS LAST, gr.created_at DESC
    LIMIT 1
  ) r ON true
  WHERE l.code = p_code;
$$;

REVOKE ALL ON FUNCTION public.invite_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_preview(text) TO anon, authenticated;


-- ── Who else is in the room ───────────────────────────────────────────────
--
-- Separate from the preview because it is a list, and because the invite
-- screen offers a friend button beside each of them.

CREATE OR REPLACE FUNCTION public.invite_room_players(p_code text)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  avatar_url text,
  animated_avatar_url text,
  country_code text,
  is_host boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.user_id,
    COALESCE(p.nickname, rp.nickname),
    COALESCE(p.avatar_url, rp.avatar_url),
    p.animated_avatar_url,
    p.country_code,
    rp.user_id = r.host_user_id
  FROM invite_links l
  JOIN LATERAL (
    SELECT gr.id, gr.host_user_id
    FROM room_participants me
    JOIN game_rooms gr ON gr.id = me.room_id
    WHERE me.user_id = l.host_user_id
      AND gr.status = 'waiting'
      AND gr.is_archived IS NOT TRUE
    ORDER BY gr.last_activity_at DESC NULLS LAST, gr.created_at DESC
    LIMIT 1
  ) r ON true
  JOIN room_participants rp ON rp.room_id = r.id
  LEFT JOIN profiles p ON p.user_id = rp.user_id
  WHERE l.code = p_code
  ORDER BY (rp.user_id = r.host_user_id) DESC, rp.joined_at;
$$;

REVOKE ALL ON FUNCTION public.invite_room_players(text) FROM public;
GRANT EXECUTE ON FUNCTION public.invite_room_players(text) TO anon, authenticated;


-- ── Accepting ─────────────────────────────────────────────────────────────
--
-- The one write, and the reason this is a function rather than a client
-- insert. friendships lets a signed-in user insert any row where they are
-- user_id -- including status 'accepted' -- so a client-side "we are friends
-- now" is a client-side "I am in your friends list now", for anyone whose id
-- you can learn. Holding a code is the proof that the host asked, and only
-- the database can check it.
--
-- Idempotent in both directions: an existing row in either orientation is
-- promoted to accepted rather than duplicated, so opening the link twice, or
-- accepting an invite from someone whose friend request you already have,
-- both land on one accepted friendship.

CREATE OR REPLACE FUNCTION public.accept_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  host uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sign in to accept an invite';
  END IF;

  SELECT host_user_id INTO host FROM invite_links WHERE code = p_code;
  IF host IS NULL THEN
    RAISE EXCEPTION 'That invite link is not valid';
  END IF;

  -- Opening your own link is not an error, it just makes no friendship.
  IF host = caller THEN
    RETURN host;
  END IF;

  UPDATE friendships
  SET status = 'accepted', accepted_at = COALESCE(accepted_at, now())
  WHERE (user_id = caller AND friend_id = host)
     OR (user_id = host AND friend_id = caller);

  IF NOT FOUND THEN
    INSERT INTO friendships (user_id, friend_id, status, accepted_at)
    VALUES (caller, host, 'accepted', now())
    ON CONFLICT (user_id, friend_id)
    DO UPDATE SET status = 'accepted', accepted_at = COALESCE(friendships.accepted_at, now());
  END IF;

  RETURN host;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
