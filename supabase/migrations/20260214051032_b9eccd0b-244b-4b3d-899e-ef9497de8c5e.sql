
-- Allow admins to read all game_sessions
CREATE POLICY "Admins can view all game sessions"
  ON public.game_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_daily_plays
CREATE POLICY "Admins can view all daily plays"
  ON public.user_daily_plays FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all room_match_history
CREATE POLICY "Admins can view all room match history"
  ON public.room_match_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
