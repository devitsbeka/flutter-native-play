-- Allow users to delete their own play records
CREATE POLICY "Users can delete their own plays"
ON public.quiz_post_plays
FOR DELETE
USING (auth.uid() = user_id);