-- Team Battle AI bots: fill the empty seats when there aren't enough humans.
--
-- The product rule, decided with the owner: a host can add AI players to a
-- PRIVATE Team Battle lobby so a short roster still makes a match. Bots are
-- honest about being bots — an is_bot flag the UI renders as a robot, never
-- a fake human — and the global matchmaking queue stays bot-free (the Quick
-- Game bot precedent stays in Quick Game; docs/GAME_TYPES_DESIGN.md §5.1).
--
-- Everything a bot "does" happens server-side inside the existing deadline
-- pump, so no client is trusted to play for it:
--   * a bot never throws, votes, or answers — tb_team_throw already
--     random-fills missing gestures, the vote falls back to rotation order,
--     and the bot's rapid-fire turn is rolled here in tb_advance (a pick,
--     a difficulty-scaled score, a short showcase window, then the normal
--     turn close);
--   * the humans-only counts below mean a lobby of 2 humans + 8 bots still
--     resolves the opener and the vote the moment both humans have acted;
--   * a bot is never a super-round champion while its team has any human,
--     and an all-bot champion answers by dice roll at the deadline;
--   * tb_settle pays humans only — a bot has no profile and earns nothing.
--
-- The changed functions are redefined here in full (CREATE OR REPLACE);
-- the originals shipped in 20260917100000_team_battle.sql, which is already
-- deployed and therefore not edited.

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- ── add / remove bots (host only, lobby only) ──────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_add_bot(p_room_id uuid, p_team text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
  v_bot uuid := gen_random_uuid();
  v_names constant text[] := ARRAY[
    'რობო ნიკა', 'ბოტ-გიო', 'კიბერ ანა', 'ალგო ლუკა',
    'პიქსელ თაკო', 'ტურბო დათო', 'ნეო ნინო', 'მექა საბა'];
  v_team_count integer;
  v_total integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'Unknown team %', p_team;
  END IF;

  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.host_user_id <> v_caller THEN
    RAISE EXCEPTION 'Only the host can add bots';
  END IF;
  IF v_room.game_type_key IS DISTINCT FROM 'team_battle' THEN
    RAISE EXCEPTION 'Not a team battle room';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  SELECT count(*) FILTER (WHERE team = p_team), count(*)
    INTO v_team_count, v_total
    FROM public.room_participants
   WHERE room_id = p_room_id AND status IN ('joined', 'ready', 'playing');
  IF v_team_count >= 5 THEN
    RAISE EXCEPTION 'That team is full';
  END IF;
  IF v_total >= COALESCE(v_room.max_players, 10) THEN
    RAISE EXCEPTION 'The room is full';
  END IF;

  INSERT INTO public.room_participants
    (room_id, user_id, nickname, is_host, status, team, is_bot)
  VALUES
    (p_room_id, v_bot, v_names[1 + floor(random() * array_length(v_names, 1))::int],
     false, 'joined', p_team, true);

  RETURN v_bot;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_add_bot(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_add_bot(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.tb_remove_bot(p_room_id uuid, p_bot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_room public.game_rooms%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_room FROM public.game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.host_user_id <> v_caller THEN
    RAISE EXCEPTION 'Only the host can remove bots';
  END IF;
  IF v_room.status = 'playing' THEN
    RAISE EXCEPTION 'Match already running';
  END IF;

  DELETE FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = p_bot_id AND is_bot;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such bot in this room';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tb_remove_bot(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_remove_bot(uuid, uuid) TO authenticated;

-- ── humans-only counts for the opener and the vote ─────────────────────────
-- (Full redefinitions; only the counting predicates changed.)

CREATE OR REPLACE FUNCTION public.tb_submit_rps(p_room_id uuid, p_throw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_players integer;
  v_throws jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_throw NOT IN ('rock', 'paper', 'scissors') THEN
    RAISE EXCEPTION 'Unknown gesture: %', p_throw;
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'rps' THEN
    RAISE EXCEPTION 'Not in the rock-paper-scissors phase';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = v_caller
       AND team IS NOT NULL AND status = 'playing' AND NOT is_bot
  ) THEN
    RAISE EXCEPTION 'Not a player in this match';
  END IF;

  v_throws := COALESCE(v_state.rps -> 'throws', '{}'::jsonb)
                || jsonb_build_object(v_caller::text, p_throw);

  UPDATE public.team_battle_state
     SET rps = COALESCE(rps, '{}'::jsonb) || jsonb_build_object('throws', v_throws),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  -- Bots never throw; tb_team_throw dices for them at resolution. The
  -- opener resolves the moment every HUMAN has thrown.
  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL
     AND status = 'playing' AND NOT is_bot;

  IF (SELECT count(*) FROM jsonb_object_keys(v_throws)) >= v_players THEN
    PERFORM public.tb_resolve_rps(v_state);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tb_vote_super(p_room_id uuid, p_candidate uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_team text;
  v_votes jsonb;
  v_players integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_state FROM public.team_battle_state
   WHERE room_id = p_room_id FOR UPDATE;
  IF v_state.room_id IS NULL OR v_state.phase <> 'super_vote' THEN
    RAISE EXCEPTION 'Not in the super-round vote';
  END IF;

  SELECT team INTO v_team FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = v_caller
     AND status = 'playing' AND NOT is_bot;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Not a player in this match';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
     WHERE room_id = p_room_id AND user_id = p_candidate
       AND team = v_team AND status = 'playing'
  ) THEN
    RAISE EXCEPTION 'Champion must be on your own team';
  END IF;

  v_votes := COALESCE(v_state.super -> 'votes', '{}'::jsonb)
               || jsonb_build_object(v_caller::text, p_candidate::text);

  UPDATE public.team_battle_state
     SET super = super || jsonb_build_object('votes', v_votes),
         updated_at = now()
   WHERE room_id = p_room_id
  RETURNING * INTO v_state;

  SELECT count(*) INTO v_players
    FROM public.room_participants
   WHERE room_id = p_room_id AND team IS NOT NULL
     AND status = 'playing' AND NOT is_bot;

  IF (SELECT count(*) FROM jsonb_object_keys(v_votes)) >= v_players THEN
    PERFORM public.tb_resolve_super_vote(v_state);
  END IF;
END;
$$;

-- Champions: humans before bots, then votes, then rotation order. A bot
-- leads a team into the blitz only when the team has no humans at all.
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
   ORDER BY rp.is_bot ASC, tally.votes DESC, rp.turn_order ASC NULLS LAST
   LIMIT 1;

  SELECT rp.user_id INTO v_champion_b
    FROM public.room_participants rp
    LEFT JOIN LATERAL (
      SELECT count(*) AS votes
        FROM jsonb_each_text(COALESCE(p_state.super -> 'votes', '{}'::jsonb)) v
       WHERE v.value = rp.user_id::text
    ) tally ON true
   WHERE rp.room_id = p_state.room_id AND rp.team = 'b' AND rp.status = 'playing'
   ORDER BY rp.is_bot ASC, tally.votes DESC, rp.turn_order ASC NULLS LAST
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

-- ── the pump learns to play for bots ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_advance(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_state public.team_battle_state%ROWTYPE;
  v_tile public.team_battle_board%ROWTYPE;
  v_tile_questions integer;
  v_active_is_bot boolean;
  v_correct integer;
  v_slice integer;
  v_points integer;
  v_bot uuid;
  v_score_key text;
  v_new_score integer;
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
  IF v_state.room_id IS NULL THEN
    RAISE EXCEPTION 'No match in this room';
  END IF;

  SELECT COALESCE(is_bot, false) INTO v_active_is_bot
    FROM public.room_participants
   WHERE room_id = p_room_id AND user_id = v_state.active_player;

  IF v_state.phase = 'rps' AND now() > v_state.deadline THEN
    PERFORM public.tb_resolve_rps(v_state);

  ELSIF v_state.phase = 'board' AND (now() > v_state.deadline OR v_active_is_bot) THEN
    SELECT * INTO v_tile
      FROM public.team_battle_board
     WHERE game_id = v_state.game_id AND claimed_by_team IS NULL
     ORDER BY random() LIMIT 1;

    IF v_active_is_bot THEN
      -- The bot's whole turn, rolled here: a difficulty-scaled score and a
      -- short showcase window so the room sees the turn happen; the normal
      -- rapid_fire close then claims the tile and rotates.
      v_tile_questions := jsonb_array_length(v_tile.questions);
      v_correct := CASE v_tile.difficulty
                     WHEN 'easy' THEN 2 + floor(random() * 4)::int    -- 2..5
                     WHEN 'medium' THEN 1 + floor(random() * 4)::int  -- 1..4
                     ELSE floor(random() * 4)::int                    -- 0..3
                   END;
      v_correct := LEAST(v_correct, v_state.target_correct, v_tile_questions);
      v_slice := GREATEST(1, v_tile.price / v_state.target_correct);
      v_points := LEAST(v_correct * v_slice, v_tile.price);

      UPDATE public.team_battle_board
         SET correct_count = v_correct, points_earned = v_points
       WHERE id = v_tile.id;
      UPDATE public.team_battle_state
         SET phase = 'rapid_fire',
             active_tile = v_tile.id,
             turn_answers = LEAST(v_tile_questions, v_state.target_correct + 2),
             team_a_score = team_a_score + CASE WHEN v_state.active_team = 'a' THEN v_points ELSE 0 END,
             team_b_score = team_b_score + CASE WHEN v_state.active_team = 'b' THEN v_points ELSE 0 END,
             deadline = now() + interval '8 seconds',
             updated_at = now()
       WHERE room_id = p_room_id;
    ELSE
      -- A human pick that never came: play a random tile rather than stall.
      UPDATE public.team_battle_state
         SET phase = 'rapid_fire',
             active_tile = v_tile.id,
             turn_answers = 0,
             deadline = now() + make_interval(secs => v_state.turn_seconds),
             updated_at = now()
       WHERE room_id = p_room_id;
    END IF;

  ELSIF v_state.phase = 'rapid_fire' THEN
    SELECT jsonb_array_length(questions) INTO v_tile_questions
      FROM public.team_battle_board WHERE id = v_state.active_tile;
    IF now() > v_state.deadline
       OR (NOT v_active_is_bot AND v_state.turn_answers >= v_tile_questions) THEN
      PERFORM public.tb_close_turn(v_state);
    END IF;

  ELSIF v_state.phase = 'super_vote' AND now() > v_state.deadline THEN
    PERFORM public.tb_resolve_super_vote(v_state);

  ELSIF v_state.phase = 'super_round' AND now() > v_state.deadline THEN
    -- An all-bot team's champion answers by dice at the deadline: a 35%
    -- chance to take the question, rolled once, before the round moves on.
    FOR v_bot IN
      SELECT rp.user_id FROM public.room_participants rp
       WHERE rp.room_id = p_room_id AND rp.is_bot
         AND rp.user_id::text IN (v_state.super ->> 'champion_a', v_state.super ->> 'champion_b')
         AND NOT COALESCE((v_state.super -> 'attempted' ->> rp.user_id::text)::boolean, false)
    LOOP
      IF random() < 0.35 THEN
        v_score_key := CASE WHEN v_bot::text = v_state.super ->> 'champion_a'
                            THEN 'score_a' ELSE 'score_b' END;
        v_new_score := COALESCE((v_state.super ->> v_score_key)::integer, 0) + 1;
        UPDATE public.team_battle_state
           SET super = super || jsonb_build_object(v_score_key, v_new_score),
               updated_at = now()
         WHERE room_id = p_room_id
        RETURNING * INTO v_state;
        EXIT; -- one point per question at most
      END IF;
    END LOOP;
    PERFORM public.tb_advance_super(v_state);
  END IF;

  SELECT phase INTO v_state.phase FROM public.team_battle_state WHERE room_id = p_room_id;
  RETURN v_state.phase;
END;
$$;

-- ── bots earn nothing ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tb_settle(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win_coins  constant integer := 300;
  v_play_coins constant integer := 50;
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

    BEGIN
      PERFORM public.apply_currency_grant(
        v_player.user_id, 'team_battle_play', v_play_coins, 0, v_reference);
      IF v_player.team = v_state.winner_team THEN
        PERFORM public.apply_currency_grant(
          v_player.user_id, 'team_battle_win', v_win_coins, 0, v_reference);
      END IF;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
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
