ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_plays_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_plays_window_start timestamptz;

GRANT SELECT (free_plays_used, free_plays_window_start)
  ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_free_play()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_free_plays   constant integer := 5;
  v_window       constant interval := interval '3 hours';
  v_start        timestamptz;
  v_used         integer;
  v_now          timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT free_plays_window_start, COALESCE(free_plays_used, 0)
    INTO v_start, v_used
  FROM profiles WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF v_start IS NULL OR v_now - v_start >= v_window THEN
    UPDATE profiles
       SET free_plays_window_start = v_now,
           free_plays_used = 1
     WHERE user_id = v_uid;

    RETURN jsonb_build_object(
      'allowed', true, 'used', 1, 'limit', v_free_plays,
      'remaining', v_free_plays - 1,
      'window_start', v_now,
      'resets_in_seconds', EXTRACT(EPOCH FROM v_window)::integer);
  END IF;

  IF v_used >= v_free_plays THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'window_exhausted',
      'used', v_used, 'limit', v_free_plays, 'remaining', 0,
      'window_start', v_start,
      'resets_in_seconds',
        GREATEST(0, EXTRACT(EPOCH FROM (v_start + v_window - v_now))::integer));
  END IF;

  UPDATE profiles
     SET free_plays_used = v_used + 1
   WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'allowed', true, 'used', v_used + 1, 'limit', v_free_plays,
    'remaining', v_free_plays - (v_used + 1),
    'window_start', v_start,
    'resets_in_seconds',
      GREATEST(0, EXTRACT(EPOCH FROM (v_start + v_window - v_now))::integer));
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_free_play() TO authenticated;