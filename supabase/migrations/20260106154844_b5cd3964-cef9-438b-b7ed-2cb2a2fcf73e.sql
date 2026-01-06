-- Allow anyone to update vote counts on active trivia_facts
CREATE POLICY "Users can update vote counts"
  ON public.trivia_facts
  FOR UPDATE
  USING (is_active = true)
  WITH CHECK (is_active = true);