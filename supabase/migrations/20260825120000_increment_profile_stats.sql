-- Profile XP and game counters were settled client-side as absolute writes:
-- read total_points, add the reward in JS, write the sum back. Two things
-- finishing at once — a room game and the mission it completes, a solo game
-- and a level bonus — each read the SAME starting number and the last write
-- wins, so one of the two grants silently vanishes. The scores column solved
-- this long ago with increment_participant_score; this is the same medicine
-- for profiles: the database does the addition, so concurrent grants stack
-- instead of overwriting each other.
--
-- Streaks are not pure additions (win extends, loss resets, practice leaves
-- alone), so the caller passes an action and the arithmetic — including
-- best_streak = GREATEST(best, new current) — happens here against the
-- row's live values, not a client snapshot.
--
-- Bounds are sanity rails, not entitlement enforcement: total_points is
-- display/leaderboard progression the client could already write freely via
-- its own-row UPDATE policy. Real currency stays in credit_gameplay_reward.

CREATE OR REPLACE FUNCTION public.increment_profile_stats(
  p_points integer DEFAULT 0,
  p_games_played integer DEFAULT 0,
  p_games_won integer DEFAULT 0,
  p_correct_answers integer DEFAULT 0,
  p_streak_action text DEFAULT 'none'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_points < 0 OR p_points > 5000
     OR p_games_played < 0 OR p_games_played > 1
     OR p_games_won < 0 OR p_games_won > 1
     OR p_correct_answers < 0 OR p_correct_answers > 500 THEN
    RAISE EXCEPTION 'increment out of bounds';
  END IF;

  IF p_streak_action NOT IN ('none', 'win', 'reset') THEN
    RAISE EXCEPTION 'invalid streak action %', p_streak_action;
  END IF;

  UPDATE public.profiles
  SET total_points = COALESCE(total_points, 0) + p_points,
      games_played = COALESCE(games_played, 0) + p_games_played,
      games_won = COALESCE(games_won, 0) + p_games_won,
      total_correct_answers = COALESCE(total_correct_answers, 0) + p_correct_answers,
      current_streak = CASE p_streak_action
        WHEN 'win' THEN COALESCE(current_streak, 0) + 1
        WHEN 'reset' THEN 0
        ELSE current_streak
      END,
      best_streak = CASE p_streak_action
        WHEN 'win' THEN GREATEST(COALESCE(best_streak, 0), COALESCE(current_streak, 0) + 1)
        ELSE best_streak
      END
  WHERE user_id = auth.uid()
  RETURNING * INTO v_row;

  IF v_row.user_id IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN jsonb_build_object(
    'total_points', v_row.total_points,
    'games_played', v_row.games_played,
    'games_won', v_row.games_won,
    'total_correct_answers', v_row.total_correct_answers,
    'current_streak', v_row.current_streak,
    'best_streak', v_row.best_streak
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_profile_stats(integer, integer, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_profile_stats(integer, integer, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_profile_stats(integer, integer, integer, integer, text) TO authenticated;
