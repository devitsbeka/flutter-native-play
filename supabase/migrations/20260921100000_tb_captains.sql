-- Team Battle captains (Figma 938:6019 lobby): the host names a captain per
-- team in the lobby, and on a tie that captain IS the super-round champion —
-- the vote phase still runs (it is the tie-break ceremony and the fallback
-- when no captain was named), but a named captain outranks the tally.
--
-- Invariant kept from 20260920100000: a bot never champions a team that has
-- any human, captained or not — the human-first ordering stays outermost.

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS is_captain boolean NOT NULL DEFAULT false;

-- ── the host names a captain ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_set_captain(p_room_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_team   text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'TB_NOT_AUTHENTICATED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller AND is_host
  ) THEN
    RAISE EXCEPTION 'TB_NOT_HOST';
  END IF;

  SELECT team INTO v_team
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = p_user_id;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'TB_NOT_A_TEAM_MEMBER';
  END IF;

  -- One captain per team: the new one replaces any previous.
  UPDATE public.room_participants
     SET is_captain = (user_id = p_user_id)
   WHERE room_id = p_room_id AND team = v_team;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_set_captain(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_set_captain(uuid, uuid) TO authenticated;

-- ── champions prefer the named captain ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_resolve_super_vote(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champion_a uuid;
  v_champion_b uuid;
BEGIN
  SELECT rp.user_id INTO v_champion_a
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(COALESCE(p_state.super -> 'votes', '{}'::jsonb)) v
       WHERE v.value = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_state.room_id AND rp.team = 'a' AND rp.status = 'playing'
   ORDER BY rp.is_bot ASC, rp.is_captain DESC, tally.votes DESC, rp.turn_order ASC NULLS LAST
   LIMIT 1;

  SELECT rp.user_id INTO v_champion_b
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(COALESCE(p_state.super -> 'votes', '{}'::jsonb)) v
       WHERE v.value = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_state.room_id AND rp.team = 'b' AND rp.status = 'playing'
   ORDER BY rp.is_bot ASC, rp.is_captain DESC, tally.votes DESC, rp.turn_order ASC NULLS LAST
   LIMIT 1;

  UPDATE public.team_battle_state
     SET phase = 'super_round',
         deadline = now() + interval '15 seconds',
         super = COALESCE(p_state.super, '{}'::jsonb)
                   || jsonb_build_object('champion_a', v_champion_a, 'champion_b', v_champion_b,
                                         'question_index', 0, 'attempted', '{}'::jsonb,
                                         'score_a', 0, 'score_b', 0),
         updated_at = now()
   WHERE room_id = p_state.room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_resolve_super_vote(public.team_battle_state) FROM PUBLIC, anon;
