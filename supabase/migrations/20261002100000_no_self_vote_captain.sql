-- The armband is given, not taken.
--
-- "never for yourself" has been the rule since the vote sheet was built, and
-- both lobbies have always drawn it: the arena's sheet and the King couch's
-- both mark your own row unselectable
-- (`selectable: !p.is_bot && p.user_id !== user?.id`). But tb_vote_captain
-- never checked. Its candidate guard asked three questions — is this person
-- seated, on my team, and human? — and "is this person me?" was not one of
-- them, so a vote for yourself sent straight to the RPC was accepted and
-- tallied like any other.
--
-- What it is worth is one vote, not two: everybody has exactly one, and this
-- only lets you aim yours at yourself. Nothing scarce is minted — no coins,
-- no VIP — so this is a house rule rather than a hole in the money. But it
-- is a house rule the client already enforces and the server did not, which
-- is precisely the split that lets a hand-made call beat the UI. In a bench
-- of three, one vote decides a 1-1-1.
--
-- Its own message, so a refusal is diagnosable rather than being blamed on
-- the team check next to it.

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

  -- You cannot nominate yourself. Checked before the seat lookups so the
  -- reason given is the real one.
  IF p_candidate = v_caller THEN
    RAISE EXCEPTION 'You cannot vote for yourself';
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
