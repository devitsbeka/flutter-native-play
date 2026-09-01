-- Rock-paper-scissors: ties replay, and every hand is shown.
--
-- The opener resolved a tied throw with a hidden coin flip — one team just
-- "started picking" and nobody knew why. The owner's rule: a tie means
-- another hand, until somebody actually wins the right to pick first. And
-- the throws themselves should be seen: every resolution now records the
-- round's hands in rps.last (per-player throws, both team gestures, tie or
-- winner), which the client replays as the reveal — a tie banner with
-- everyone's hands and a fresh 20-second round, or a "team X picks first"
-- banner over the opening board.
--
-- rps.round counts the hands, so a client can tell a fresh replay from a
-- refetch. Full redefinition of tb_resolve_rps (20260917100000); the tie
-- branch is new, the win branch only gained the reveal record. Two all-bot
-- teams can tie repeatedly, but each replay re-rolls at the deadline pump,
-- so the streak dies fast.

CREATE OR REPLACE FUNCTION public.tb_resolve_rps(p_state public.team_battle_state)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a text;
  v_b text;
  v_winner text;
  v_round integer := COALESCE((p_state.rps ->> 'round')::integer, 0) + 1;
  v_reveal jsonb;
BEGIN
  v_a := public.tb_team_throw(p_state.room_id, COALESCE(p_state.rps -> 'throws', '{}'::jsonb), 'a');
  v_b := public.tb_team_throw(p_state.room_id, COALESCE(p_state.rps -> 'throws', '{}'::jsonb), 'b');

  v_reveal := jsonb_build_object(
    'team_a', v_a,
    'team_b', v_b,
    'tie', v_a = v_b,
    'throws', COALESCE(p_state.rps -> 'throws', '{}'::jsonb));

  IF v_a = v_b THEN
    -- Another hand: everyone's throw is cleared, the reveal shows the tied
    -- round, and the clock restarts.
    UPDATE public.team_battle_state
       SET rps = jsonb_build_object(
             'throws', '{}'::jsonb,
             'round', v_round,
             'last', v_reveal),
           deadline = now() + interval '20 seconds',
           updated_at = now()
     WHERE room_id = p_state.room_id;
    RETURN;
  END IF;

  IF (v_a = 'rock' AND v_b = 'scissors')
     OR (v_a = 'scissors' AND v_b = 'paper')
     OR (v_a = 'paper' AND v_b = 'rock') THEN
    v_winner := 'a';
  ELSE
    v_winner := 'b';
  END IF;

  UPDATE public.team_battle_state
     SET phase = 'board',
         active_team = v_winner,
         active_player = public.tb_next_player(p_state.room_id, p_state.game_id, v_winner),
         deadline = now() + interval '30 seconds',
         rps = COALESCE(p_state.rps, '{}'::jsonb)
                 || jsonb_build_object(
                      'team_a', v_a, 'team_b', v_b, 'winner', v_winner,
                      'round', v_round,
                      'last', v_reveal || jsonb_build_object('winner', v_winner)),
         updated_at = now()
   WHERE room_id = p_state.room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_resolve_rps(public.team_battle_state) FROM PUBLIC, anon, authenticated;
