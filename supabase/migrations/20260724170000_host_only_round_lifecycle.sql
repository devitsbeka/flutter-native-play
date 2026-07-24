-- Product rule change: ONLY the host may add categories/rounds and start
-- games. Reverts the participant round-lifecycle policies (added in
-- 20260724160000) back to host-only. Uses IF EXISTS so this applies cleanly
-- whether or not that migration ran.
--
-- Kept: host-scoped room-wide player_answers cleanup (round resets delete the
-- whole room's answers; the original own-rows-only policy silently blocked
-- the host from clearing other players' stale answers between rounds).

DROP POLICY IF EXISTS "Participants can insert room games" ON public.room_games;
DROP POLICY IF EXISTS "Participants can update room games" ON public.room_games;
DROP POLICY IF EXISTS "Participants can insert room questions" ON public.room_questions;
DROP POLICY IF EXISTS "Participants can delete room questions" ON public.room_questions;
DROP POLICY IF EXISTS "Participants can insert queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can update queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can delete queue items" ON public.room_category_queue;
DROP POLICY IF EXISTS "Participants can clear room answers" ON public.player_answers;

CREATE POLICY "Host can clear room answers" ON public.player_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = player_answers.room_id
        AND gr.host_user_id = auth.uid()
    )
  );
