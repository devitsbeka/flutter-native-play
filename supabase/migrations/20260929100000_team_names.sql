-- ============================================================
-- A side has a NAME, not a letter.
--
-- "Team A" told nobody anything. A battle room's sides now carry names —
-- dealt at creation from the app's team-name pools (plural, the owner's
-- rule: პინგვინები, მებრძოლთა გუნდი, არწივთა კლანი...) and written with
-- the room row by the host's own insert, exactly like the crests. After
-- that the name belongs to the SIDE: tb_set_team_name mirrors
-- tb_set_team_icon — only that team's captain (elected, or the
-- earliest-joined human while the votes are at zero) may rename it.
-- ============================================================

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS team_a_name text,
  ADD COLUMN IF NOT EXISTS team_b_name text;

CREATE OR REPLACE FUNCTION public.tb_set_team_name(
  p_room_id uuid,
  p_team text,
  p_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_captain uuid;
  v_name text := NULLIF(btrim(COALESCE(p_name, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first';
  END IF;
  IF p_team NOT IN ('a', 'b') THEN
    RAISE EXCEPTION 'no such team';
  END IF;
  IF v_name IS NOT NULL AND length(v_name) > 40 THEN
    RAISE EXCEPTION 'that name is too long';
  END IF;

  -- The side's captain: the elected one, or — while the votes are at zero —
  -- the earliest-joined human, the same person the lobby's chip shows.
  -- Being the host buys nothing here (the tb_set_team_icon rule).
  SELECT user_id INTO v_captain
    FROM public.room_participants
   WHERE room_id = p_room_id AND team = p_team
     AND NOT COALESCE(is_bot, false)
     AND status IN ('joined', 'ready', 'playing')
   ORDER BY is_captain DESC, joined_at ASC NULLS LAST
   LIMIT 1;
  IF v_captain IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'only that team''s captain names it';
  END IF;

  UPDATE game_rooms
     SET team_a_name = CASE WHEN p_team = 'a' THEN v_name ELSE team_a_name END,
         team_b_name = CASE WHEN p_team = 'b' THEN v_name ELSE team_b_name END
   WHERE id = p_room_id;
END $$;

REVOKE ALL ON FUNCTION public.tb_set_team_name(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tb_set_team_name(uuid, text, text) TO authenticated;
