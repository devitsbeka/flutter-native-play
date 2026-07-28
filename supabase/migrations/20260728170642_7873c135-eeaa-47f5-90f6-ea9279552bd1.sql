CREATE OR REPLACE FUNCTION public.tv_claim_session(
  p_pairing_code text,
  p_room_id       uuid DEFAULT NULL,
  p_room_name     text DEFAULT NULL,
  p_category_name text DEFAULT NULL,
  p_category_icon text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_session_id uuid;
  v_candidates integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  IF p_pairing_code IS NULL OR btrim(p_pairing_code) = '' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_code');
  END IF;

  SELECT count(*) INTO v_candidates
  FROM tv_sessions s
  WHERE s.tv_pairing_code = btrim(p_pairing_code)
    AND s.is_paired = false
    AND s.host_user_id IS NULL
    AND s.status = 'waiting'
    AND s.expires_at > now();

  IF v_candidates = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_found');
  END IF;

  SELECT s.id INTO v_session_id
  FROM tv_sessions s
  WHERE s.tv_pairing_code = btrim(p_pairing_code)
    AND s.is_paired = false
    AND s.host_user_id IS NULL
    AND s.status = 'waiting'
    AND s.expires_at > now()
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  UPDATE tv_sessions
     SET host_user_id  = v_uid,
         is_paired     = true,
         status        = 'paired',
         room_id       = COALESCE(p_room_id,       room_id),
         room_name     = COALESCE(p_room_name,     room_name),
         category_name = COALESCE(p_category_name, category_name),
         category_icon = COALESCE(p_category_icon, category_icon)
   WHERE id = v_session_id
     AND host_user_id IS NULL
     AND is_paired = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'session_id', v_session_id,
    'live_candidates', v_candidates);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tv_claim_session(text, uuid, text, text, text)
  TO anon, authenticated;