-- First-correct-answer bonus (unified scoring policy).
--
-- The first player to submit a correct answer on a question earns a flat
-- bonus (FIRST_ANSWER_BONUS in src/utils/scoring.ts). "First" is decided by
-- this claim table's primary key: every correct answerer attempts an insert
-- for (game_id, question_index), and the row that lands first wins — the
-- database resolves races, not client clocks.
--
-- Same idempotency pattern as tv_observer_awards.

CREATE TABLE IF NOT EXISTS public.room_first_correct (
  game_id        uuid        NOT NULL,
  question_index integer     NOT NULL,
  user_id        uuid        NOT NULL,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, question_index)
);

ALTER TABLE public.room_first_correct ENABLE ROW LEVEL SECURITY;

-- Players (including anonymous guests) may claim only as themselves.
CREATE POLICY "claim first correct as self"
  ON public.room_first_correct
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "first correct readable"
  ON public.room_first_correct
  FOR SELECT TO authenticated
  USING (true);
