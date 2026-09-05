-- Reports on a King puzzle ("the answer key is wrong", "this translation
-- lost the logic").
--
-- The pool is seeded rather than authored in the app, so a bad puzzle is a
-- data bug and the player at the reveal is the only person who ever sees
-- it. The flag under the explanation (src/pages/KingPage.tsx) files one row
-- here per tap.
--
-- No question_id: king_questions has no client read policy, and neither
-- king_state nor king_team_state returns an id — only the text. So a report
-- names the question the way a person would, by what was on screen, plus
-- the language and the answer the server called correct. That is enough to
-- find the row:
--
--   SELECT q.id, q.language, q.question_text, q.correct_answer, q.explanation
--     FROM public.king_question_reports r
--     JOIN public.king_questions q
--       ON q.question_text = r.question_text AND q.language = r.language
--    ORDER BY r.created_at DESC;
--
-- Until this is applied the client still files the report against
-- user_reports, which the admin Reports page lists — and it keeps doing so
-- afterwards, because that page is where reports are actually read.

CREATE TABLE IF NOT EXISTS public.king_question_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  language        text NOT NULL,
  mode            text NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'team')),
  match_id        uuid,
  room_id         uuid,
  question_number integer,
  question_text   text NOT NULL,
  correct_answer  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.king_question_reports ENABLE ROW LEVEL SECURITY;

-- Anyone signed in may file a report as themselves; a guest may file one
-- with no user. Nobody reads them from the client — triage uses the service
-- role, the same rule words_word_reports (20260901130000) is written to.
DROP POLICY IF EXISTS "king_question_reports_insert_own" ON public.king_question_reports;
CREATE POLICY "king_question_reports_insert_own"
  ON public.king_question_reports FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Spelled out rather than left to Supabase's default privileges on schema
-- public: INSERT only, and nothing else. The policy above bounds WHOSE name
-- a report may carry; this bounds what can be done to the table at all, so
-- neither reading, editing nor deleting a filed report is reachable from a
-- client even if a future default privilege hands the role more.
REVOKE ALL ON TABLE public.king_question_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.king_question_reports TO anon, authenticated;

-- The triage query groups by question, so index what it joins on.
CREATE INDEX IF NOT EXISTS king_question_reports_question_idx
  ON public.king_question_reports (language, question_text);
CREATE INDEX IF NOT EXISTS king_question_reports_created_idx
  ON public.king_question_reports (created_at DESC);
