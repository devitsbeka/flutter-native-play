
DROP POLICY IF EXISTS "Users can view their own plays" ON quiz_post_plays;

CREATE POLICY "Anyone can view plays"
  ON quiz_post_plays
  FOR SELECT
  USING (true);
