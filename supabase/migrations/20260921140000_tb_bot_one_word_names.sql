-- Bots get normal one-word names.
--
-- The owner's call after seeing "პიქსელ თაკო" captain a team: the two-word
-- robo-prefixed names read as gimmicks next to real players. Bots keep the
-- is_bot flag (the UI still renders the preset bot face and never fakes a
-- human), but their display names are now ordinary one-word Georgian names.
--
-- Full redefinition of tb_add_bot; ONLY the v_names pool changed from
-- 20260920100000_team_battle_bots.sql. Bots already seated in old lobbies
-- keep the name they were dealt — lobbies are ephemeral.

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
    'ნიკა', 'გიო', 'ანა', 'ლუკა', 'თაკო', 'დათო',
    'ნინო', 'საბა', 'მარი', 'სანდრო', 'ელენე', 'თემო'];
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
