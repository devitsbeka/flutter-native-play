-- 5 free games per 3 hours for non-PRO users.
--
-- What exists today is not a smaller version of this rule - it is a
-- different rule entirely:
--
--   const MAX_FREE_PLAYS = 5;                          // "Lifetime limit"
--   const gamesPlayed = profile?.games_played || 0;    // lifetime stat
--   const playsRemaining = max(0, 5 - gamesPlayed);
--   // once exhausted: ONE play back every 3 hours
--
-- So it is five games FOR LIFE, then a single play every three hours. That
-- is why the report was "I had 1 game instead of 5": anyone past their
-- lifetime five only ever sees the one regen play. In production 325 of 647
-- profiles are already at games_played >= 5, i.e. permanently on 0/5.
--
-- games_played cannot be reused as the quota: it is a lifetime statistic
-- shown on the profile ("12 თამაშები"), so it must not be reset. The quota
-- needs its own window.
--
-- Server-side, and deliberately so. The column-grant lockdown means the
-- client cannot write new profile columns anyway, and a quota the phone
-- can edit is not a quota. consume_free_play() is the only writer.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_plays_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_plays_window_start timestamptz;

-- Readable by the owner's client so the UI can show "n/5" and the countdown.
-- Mirrors the existing column-list grant; the two new columns are appended
-- rather than the grant being replaced wholesale.
GRANT SELECT (free_plays_used, free_plays_window_start)
  ON public.profiles TO anon, authenticated;


-- Rolls the window and consumes one play, atomically.
--
--   * window empty or older than 3h -> start a fresh window, used = 1
--   * window live and used < 5      -> used + 1
--   * window live and used >= 5     -> refused, with seconds until reset
--
-- Returns the state the UI needs either way, so the caller never has to
-- re-read the row to find out where it stands.
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

  -- A window that never started, or has aged out, begins now.
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
