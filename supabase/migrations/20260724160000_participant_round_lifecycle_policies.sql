-- The multiplayer design lets ANY room participant start the next round
-- (results-screen "Play again", queued categories), but the round-lifecycle
-- tables were host-only under RLS. A guest-initiated round start therefore
-- silently half-failed: no room_games row created, no questions inserted,
-- and the consumed queue item never deleted - while the game_rooms status
-- flip (open to participants) still succeeded. The room entered "playing"
-- with nothing to play, and stale queue rows hijacked later round starts.
--
-- These ADDITIVE permissive policies let any participant of a room perform
-- the round-lifecycle writes; existing host-only policies remain in place.

CREATE POLICY "Participants can insert room games" ON public.room_games
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_games.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update room games" ON public.room_games
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_games.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert room questions" ON public.room_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_questions.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete room questions" ON public.room_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_questions.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert queue items" ON public.room_category_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update queue items" ON public.room_category_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete queue items" ON public.room_category_queue
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = room_category_queue.room_id AND rp.user_id = auth.uid()
    )
  );

-- Round resets wipe player_answers for the whole room; own-rows-only DELETE
-- left other players' stale answers behind (skewing per-round answer counts)
CREATE POLICY "Participants can clear room answers" ON public.player_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = player_answers.room_id AND rp.user_id = auth.uid()
    )
  );
