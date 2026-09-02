-- ============================================================
-- Leaving a live match costs something, and a match nobody is
-- playing ends itself.
--
-- 1. tb_leave_match: a player may walk out of a RUNNING battle, but the
--    desertion fee is 200 coins (or their whole balance when it is
--    smaller — a player must never be trapped in a match by poverty).
--    The debit is done here, server-side, under the same lock-and-floor
--    rules as update_user_currency (CLAUDE.md rule 3); the lobby stays
--    free to leave, as it always was. If the leaver held the spotlight,
--    the turn's deadline collapses so the next tb_advance moves on; a
--    side left EMPTY ends the game (phase done — the standard settle
--    path pays out by the scores as they stand).
--
-- 2. tb_finish_stale: every live client calls tb_advance within seconds
--    of a deadline, so a 'playing' room whose deadline has sat unanswered
--    for five minutes is a match nobody is watching. Any signed-in client
--    may report one; the server re-checks the staleness itself and closes
--    it (phase done, room completed), which also drops it off the Public
--    tab (the listing carries only waiting/playing rooms).
-- ============================================================

CREATE OR REPLACE FUNCTION public.tb_leave_match(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room game_rooms%ROWTYPE;
  v_me room_participants%ROWTYPE;
  v_coins integer;
  v_left_a integer;
  v_left_b integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL OR v_room.game_type_key <> 'team_battle' THEN
    RAISE EXCEPTION 'no such battle';
  END IF;
  IF v_room.status::text <> 'playing' THEN
    RAISE EXCEPTION 'the lobby is free to leave — this fee is for a live match';
  END IF;

  SELECT * INTO v_me
    FROM room_participants
   WHERE room_id = p_room_id AND user_id = v_uid;
  IF v_me.id IS NULL THEN
    RAISE EXCEPTION 'you are not in this room';
  END IF;

  -- The fee, capped at the balance: locked row, floored at zero.
  SELECT coins INTO v_coins FROM profiles WHERE user_id = v_uid FOR UPDATE;
  UPDATE profiles
     SET coins = GREATEST(COALESCE(v_coins, 0) - 200, 0),
         updated_at = now()
   WHERE user_id = v_uid;

  DELETE FROM room_participants WHERE id = v_me.id;

  -- A deserted spotlight must not stall the match for two minutes.
  UPDATE team_battle_state
     SET deadline = now(), updated_at = now()
   WHERE room_id = p_room_id AND active_player = v_uid;

  SELECT count(*) FILTER (WHERE team = 'a'),
         count(*) FILTER (WHERE team = 'b')
    INTO v_left_a, v_left_b
    FROM room_participants
   WHERE room_id = p_room_id
     AND status IN ('joined', 'ready', 'playing');
  IF COALESCE(v_left_a, 0) = 0 OR COALESCE(v_left_b, 0) = 0 THEN
    UPDATE team_battle_state
       SET phase = 'done', deadline = now(), updated_at = now()
     WHERE room_id = p_room_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.tb_leave_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_leave_match(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tb_finish_stale(p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room game_rooms%ROWTYPE;
  v_state team_battle_state%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room.id IS NULL
     OR v_room.game_type_key <> 'team_battle'
     OR v_room.status::text <> 'playing' THEN
    RETURN false;
  END IF;

  SELECT * INTO v_state FROM team_battle_state WHERE room_id = p_room_id;

  -- Playing with no state at all is a start that never finished landing;
  -- with state, five silent minutes past the deadline means nobody is
  -- watching — a live room advances within seconds.
  IF v_state.room_id IS NOT NULL THEN
    IF v_state.phase = 'done'
       OR v_state.deadline IS NULL
       OR v_state.deadline > now() - interval '5 minutes' THEN
      RETURN false;
    END IF;
    UPDATE team_battle_state
       SET phase = 'done', deadline = now(), updated_at = now()
     WHERE room_id = p_room_id;
  ELSIF COALESCE(v_room.last_activity_at, v_room.created_at) > now() - interval '10 minutes' THEN
    RETURN false;
  END IF;

  UPDATE game_rooms
     SET status = 'completed'::public.room_status,
         last_activity_at = now()
   WHERE id = p_room_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.tb_finish_stale(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_finish_stale(uuid) TO authenticated;
