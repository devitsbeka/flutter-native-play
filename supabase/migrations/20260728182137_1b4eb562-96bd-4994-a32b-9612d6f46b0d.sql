DROP POLICY IF EXISTS "Players can insert answers" ON public.player_answers;

CREATE POLICY "Players can insert their own answers"
ON public.player_answers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Players can update their own answers" ON public.player_answers;

CREATE POLICY "Players can update their own answers"
ON public.player_answers
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);