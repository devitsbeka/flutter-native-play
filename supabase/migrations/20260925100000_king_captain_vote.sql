-- The King's couch elects its captain too, and a crest belongs to one side.
--
-- Three things, one owner's rule: "we need captain in VS king game too …
-- make sure host is not able to change other team's icon … after I'm
-- creating room, I can be replaced by someone else after captain votes
-- before game starts."
--
-- 1. The couch votes. tb_vote_captain (20260921150000) only answered for a
--    Trivia Battle room, tallying inside the voter's own team. A King room
--    has no sides — every human on the couch is one team, and the captain
--    is the one who opens the options and locks the answer in the duel
--    (20260921170000). The same function now serves both: the electorate
--    is "my team" in the arena and "everyone seated" on the couch, and the
--    same plurality-with-earliest-joiner-tiebreak decides. Same signature,
--    so every existing caller and the SQL suite keep working.
--
-- 2. The armband is not the host's to keep. king_team_start used to write
--    the host into king_team_matches.captain unconditionally; it now seats
--    the elected captain, falling back to the host only while nobody has
--    been voted in. Starting the duel stays host-only — that is the room's
--    owner deciding when, not who leads.
--
-- 3. A crest belongs to its side. tb_set_team_icon let the host dress
--    either team "because somebody has to before a vote". The host can now
--    dress only the side they captain. A side that has not voted still has
--    a captain for this purpose — the same one the lobby shows while the
--    votes are at zero: its earliest-joined human. So the host still
--    dresses their own side on day one, and never the other one.

-- ── 1. one vote function for both lobbies ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_vote_captain(p_room_id uuid, p_candidate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_team text;
  v_caller_bot boolean;
  v_cand_team text;
  v_cand_bot boolean;
  v_leader uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type_key NOT IN ('team_battle', 'king') THEN
    RAISE EXCEPTION 'This room has no captain to vote for';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  -- FOUND, not "team IS NULL": on the couch the team column is null for
  -- everybody, and that is the whole electorate.
  SELECT team, COALESCE(is_bot, false) INTO v_team, v_caller_bot
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = v_caller
     AND status IN ('joined', 'ready', 'playing');
  IF NOT FOUND OR v_caller_bot THEN
    RAISE EXCEPTION 'Not a seated player';
  END IF;
  IF v_room.game_type_key = 'team_battle' AND v_team IS NULL THEN
    RAISE EXCEPTION 'Not a seated player on a team';
  END IF;

  SELECT team, COALESCE(is_bot, false) INTO v_cand_team, v_cand_bot
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = p_candidate
     AND status IN ('joined', 'ready', 'playing');
  IF NOT FOUND OR v_cand_team IS DISTINCT FROM v_team OR v_cand_bot THEN
    RAISE EXCEPTION 'Captain must be a human on your own team';
  END IF;

  UPDATE public.room_participants
     SET captain_vote = p_candidate
   WHERE room_id = p_room_id AND user_id = v_caller;

  -- Plurality among the electorate's humans; the earliest joiner breaks
  -- ties, so the armband never flip-flops on equal counts.
  SELECT rp.user_id INTO v_leader
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM public.room_participants v
       WHERE v.room_id = p_room_id AND v.team IS NOT DISTINCT FROM v_team
         AND NOT COALESCE(v.is_bot, false)
         AND v.status IN ('joined', 'ready', 'playing')
         AND v.captain_vote = rp.user_id
    ) tally ON true
   WHERE rp.room_id = p_room_id AND rp.team IS NOT DISTINCT FROM v_team
     AND NOT COALESCE(rp.is_bot, false)
     AND rp.status IN ('joined', 'ready', 'playing')
   ORDER BY tally.votes DESC, rp.joined_at ASC NULLS LAST
   LIMIT 1;

  UPDATE public.room_participants
     SET is_captain = (user_id = v_leader)
   WHERE room_id = p_room_id AND team IS NOT DISTINCT FROM v_team;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_vote_captain(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_vote_captain(uuid, uuid) TO authenticated;

-- ── 2. the duel seats the elected captain ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.king_team_start(p_room_id uuid, p_language text DEFAULT 'en')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_match public.king_team_matches%ROWTYPE;
  v_captain uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type_key IS DISTINCT FROM 'king' THEN
    RAISE EXCEPTION 'Not a King lounge';
  END IF;
  IF v_room.host_user_id <> v_user THEN
    RAISE EXCEPTION 'Only the host starts the duel';
  END IF;
  PERFORM public.king_team_member(p_room_id, v_user);

  SELECT * INTO v_match FROM public.king_team_matches
   WHERE room_id = p_room_id AND status = 'playing';
  IF v_match.id IS NULL THEN
    -- Whoever the couch voted in; the host only until somebody has been.
    SELECT user_id INTO v_captain
      FROM public.room_participants
     WHERE room_id = p_room_id AND is_captain
       AND NOT COALESCE(is_bot, false)
       AND status IN ('joined', 'ready', 'playing')
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1;
    INSERT INTO public.king_team_matches (room_id, language, captain)
    VALUES (p_room_id, COALESCE(NULLIF(btrim(p_language), ''), 'en'), COALESCE(v_captain, v_user))
    RETURNING * INTO v_match;
  END IF;
  IF v_match.current_question_id IS NULL AND v_match.status = 'playing' THEN
    v_match := public.king_team_draw_into(v_match);
  END IF;
  RETURN public.king_team_state(v_match);
END;
$$;

REVOKE ALL ON FUNCTION public.king_team_start(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.king_team_start(uuid, text) TO authenticated;

-- ── 3. a crest is its own side's ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_set_team_icon(
  p_room_id uuid,
  p_team text,
  p_icon text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_captain uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  IF p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'no such team';
  END IF;
  IF p_icon IS NOT NULL AND length(p_icon) > 500 THEN
    RAISE EXCEPTION 'that is not an icon';
  END IF;

  -- The side's captain: the elected one, or — while the votes are at zero —
  -- the earliest-joined human, which is exactly who the lobby's chip shows.
  -- Being the host buys nothing here.
  SELECT user_id INTO v_captain
    FROM public.room_participants
   WHERE room_id = p_room_id AND team = p_team
     AND NOT COALESCE(is_bot, false)
     AND status IN ('joined', 'ready', 'playing')
   ORDER BY is_captain DESC, joined_at ASC NULLS LAST
   LIMIT 1;
  IF v_captain IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'only that team''s captain sets its crest';
  END IF;

  UPDATE game_rooms
     SET team_a_icon = CASE WHEN p_team = 'a' THEN p_icon ELSE team_a_icon END,
         team_b_icon = CASE WHEN p_team = 'b' THEN p_icon ELSE team_b_icon END
   WHERE id = p_room_id;
END $$;

REVOKE ALL ON FUNCTION public.tb_set_team_icon(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_set_team_icon(uuid, text, text) TO authenticated;
