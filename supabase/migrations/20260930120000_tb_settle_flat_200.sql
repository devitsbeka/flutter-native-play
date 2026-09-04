-- Team Battle pays by the head, not by the round.
--
-- The pot used to scale with the board the host picked — 50 coins a round to
-- every winning human, up to a 600 ceiling — and every player, win or lose,
-- also took a flat 50 for showing up. The owner's model is simpler and reads
-- off the room: each seat is worth 200, the winning side splits the stakes,
-- and so every winning human collects a flat 200. A losing seat collects
-- nothing (no debit — a loss costs the game, not the wallet), and the old
-- 50-coin participation grant is gone, so a winner's take is exactly 200 and
-- the "Winner takes" strip (200 × the side's size) is the literal truth.
--
-- team_battle_win's per-call ceiling is already 600, so 200 clears it; the
-- team_battle_play limit simply goes unused.

CREATE OR REPLACE FUNCTION public.tb_settle(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win_coins constant integer := 200;
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_claimed uuid;
  v_scores jsonb;
  v_reference text;
  v_player record;
  v_mvp uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not a participant of this room';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'done' THEN
    RAISE EXCEPTION 'Match is not finished';
  END IF;

  UPDATE public.team_battle_state
     SET settled = true, updated_at = now()
   WHERE room_id = p_room_id AND settled = false
  RETURNING room_id INTO v_claimed;
  IF v_claimed IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'winner_team', v_state.winner_team);
  END IF;

  v_reference := p_room_id::text || ':' || v_state.game_id::text;

  -- The history's "winner": the winning team's top HUMAN scorer, falling
  -- back to a bot only for an all-bot team.
  SELECT user_id INTO v_mvp
    FROM public.room_participants
   WHERE room_id = p_room_id AND team = v_state.winner_team
   ORDER BY is_bot ASC, COALESCE(score, 0) DESC, turn_order ASC NULLS LAST
   LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', user_id, 'nickname', nickname, 'avatar_url', avatar_url,
           'team', team, 'score', COALESCE(score, 0), 'is_bot', is_bot)
           ORDER BY team, COALESCE(score, 0) DESC), '[]'::jsonb)
    INTO v_scores
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL;

  UPDATE public.room_games
     SET completed_at = now(),
         totals_applied = true,
         winner_user_id = v_mvp,
         player_scores = v_scores,
         questions_data = jsonb_build_object(
           'mode', 'team_battle',
           'team_a_score', v_state.team_a_score,
           'team_b_score', v_state.team_b_score,
           'winner_team', v_state.winner_team)
   WHERE id = v_state.game_id;

  INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores)
  VALUES (p_room_id, v_mvp, v_scores);

  FOR v_player IN
    SELECT user_id, team FROM public.room_participants
     WHERE room_id = p_room_id AND team IS NOT NULL
       AND status = 'playing' AND NOT is_bot
  LOOP
    UPDATE public.room_participants
       SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),
           total_rounds_played = COALESCE(total_rounds_played, 0) + 1,
           total_wins = COALESCE(total_wins, 0)
             + CASE WHEN v_player.team = v_state.winner_team THEN 1 ELSE 0 END
     WHERE room_id = p_room_id AND user_id = v_player.user_id;

    -- 200 to each winning human, once (the reference makes the retry
    -- idempotent). A losing seat collects nothing.
    IF v_player.team = v_state.winner_team THEN
      BEGIN
        PERFORM public.apply_currency_grant(
          v_player.user_id, 'team_battle_win', v_win_coins, 0, v_reference);
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END LOOP;

  UPDATE public.game_rooms
     SET status = 'waiting'::public.room_status,
         current_game_id = NULL,
         last_activity_at = now()
   WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'applied', true,
    'winner_team', v_state.winner_team,
    'team_a_score', v_state.team_a_score,
    'team_b_score', v_state.team_b_score);
END;
$$;

-- A SECURITY DEFINER function is granted to PUBLIC by default (CLAUDE.md
-- rule 3). CREATE OR REPLACE keeps the grants, but state them anyway.
REVOKE ALL ON FUNCTION public.tb_settle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_settle(uuid) TO authenticated;
