-- The two things a player can do with a question once they have seen the
-- answer: keep it, or tell us it is wrong.
--
-- Both live under the answer-feedback card that appears over the "next
-- question" button in solo play (src/components/game/AnswerFeedbackCard.tsx).
--
-- `user_favorites` already exists and is CATEGORY-scoped — one row per
-- (user, category). A question is not a category, so this is its own table
-- rather than a widened one: the unique key is (user, question), and the
-- question's text and category ride along so a saved question can be listed
-- without a read policy on `questions`.
--
-- Reports follow the shape king_question_reports (20261003100000) settled
-- on: insert-only from the client, triage with the service role, and the
-- same row is ALSO filed against user_reports at the call site, because the
-- admin Reports page reads that table and nothing else. Until this file is
-- applied the client still files there under report_type 'other'; after it,
-- under 'trivia_question'.


-- ---------------------------------------------------------------------------
-- 1. Saved questions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.question_favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- text, not uuid: the same card is reachable from user-authored trivia,
  -- whose ids do not come from public.questions.
  question_id   text NOT NULL,
  question_text text,
  category_id   text,
  language      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

ALTER TABLE public.question_favorites ENABLE ROW LEVEL SECURITY;

-- A saved question is the player's own list and nobody else's.
DROP POLICY IF EXISTS "question_favorites_select_own" ON public.question_favorites;
CREATE POLICY "question_favorites_select_own"
  ON public.question_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "question_favorites_insert_own" ON public.question_favorites;
CREATE POLICY "question_favorites_insert_own"
  ON public.question_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "question_favorites_delete_own" ON public.question_favorites;
CREATE POLICY "question_favorites_delete_own"
  ON public.question_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Spelled out rather than left to the schema's default privileges: read,
-- add and remove your own rows, and nothing else. No UPDATE — a favourite
-- has nothing to edit, and re-saving is a delete plus an insert.
REVOKE ALL ON TABLE public.question_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.question_favorites TO authenticated;

CREATE INDEX IF NOT EXISTS question_favorites_user_idx
  ON public.question_favorites (user_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 2. Reports on a question in the main bank
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.question_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question_id    text,
  question_text  text NOT NULL,
  correct_answer text,
  language       text,
  -- where the player was when they flagged it: 'category', 'quick-game', …
  source         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Anyone signed in files as themselves; a guest files with no user. Nobody
-- reads these from a client — triage uses the service role.
DROP POLICY IF EXISTS "question_reports_insert_own" ON public.question_reports;
CREATE POLICY "question_reports_insert_own"
  ON public.question_reports FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

REVOKE ALL ON TABLE public.question_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.question_reports TO anon, authenticated;

CREATE INDEX IF NOT EXISTS question_reports_question_idx
  ON public.question_reports (question_id);
CREATE INDEX IF NOT EXISTS question_reports_created_idx
  ON public.question_reports (created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. The report type the admin queue will see
-- ---------------------------------------------------------------------------
--
-- user_reports.report_type has a CHECK (20260105144642, widened by
-- 20261013120000). A value not in it comes back 23514 and the report is not
-- filed at all, so the new flag has to be listed before the client can use
-- it. The client sends 'trivia_question' and falls back to 'other' on a
-- constraint violation, which is what it does until this runs.

ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_report_type_check;

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_report_type_check
  CHECK (report_type IN (
    -- what a person picks in the report sheet
    'spam', 'harassment', 'inappropriate', 'cheating', 'other',
    -- and the content-quality flags, filed against the reporter themselves
    -- because a bad question is not a person: read the description.
    'king_question', 'words_word', 'trivia_question'
  ));
