-- Captains are elected, not appointed, once a team has more than one human.
--
-- The owner's rule: a 1v1 needs no vote (each side's only human simply
-- leads, which the client's fallback already renders), but a team of two or
-- more humans picks its captain by voting in the lobby. Every member stores
-- their vote on their own participant row; each cast re-tallies the team and
-- the current plurality leader wears is_captain, ties breaking toward whoever
-- joined first. tb_set_captain (20260921100000, host-only) stays in place —
-- the host's device still uses it to roll a captain for an all-bot team.

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS captain_vote uuid;

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
  IF v_room.id IS NULL OR v_room.game_type_key IS DISTINCT FROM 'team_battle' THEN
    RAISE EXCEPTION 'Not a team battle room';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  SELECT team, COALESCE(is_bot, false) INTO v_team, v_caller_bot
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = v_caller
     AND status IN ('joined', 'ready', 'playing');
  IF v_team IS NULL OR v_caller_bot THEN
    RAISE EXCEPTION 'Not a seated player on a team';
  END IF;

  SELECT team, COALESCE(is_bot, false) INTO v_cand_team, v_cand_bot
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = p_candidate
     AND status IN ('joined', 'ready', 'playing');
  IF v_cand_team IS DISTINCT FROM v_team OR v_cand_bot THEN
    RAISE EXCEPTION 'Captain must be a human on your own team';
  END IF;

  UPDATE public.room_participants
     SET captain_vote = p_candidate
   WHERE room_id = p_room_id AND user_id = v_caller;

  -- Plurality among the team's humans; the earliest joiner breaks ties, so
  -- the armband never flip-flops on equal counts.
  SELECT rp.user_id INTO v_leader
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM public.room_participants v
       WHERE v.room_id = p_room_id AND v.team = v_team
         AND NOT COALESCE(v.is_bot, false)
         AND v.status IN ('joined', 'ready', 'playing')
         AND v.captain_vote = rp.user_id
    ) tally ON true
   WHERE rp.room_id = p_room_id AND rp.team = v_team
     AND NOT COALESCE(rp.is_bot, false)
     AND rp.status IN ('joined', 'ready', 'playing')
   ORDER BY tally.votes DESC, rp.joined_at ASC NULLS LAST
   LIMIT 1;

  UPDATE public.room_participants
     SET is_captain = (user_id = v_leader)
   WHERE room_id = p_room_id AND team = v_team;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_vote_captain(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_vote_captain(uuid, uuid) TO authenticated;
