-- Reports on a Words board word ("this is not a word", "this is rude").
--
-- The banks are generated from dictionaries (scripts/words-levels), so a
-- bad word is a data bug, and the player is the one who sees it. Each row
-- is one tap of the flag in the word's modal (src/features/words/
-- WordInfoModal.tsx). Until this migration is applied through Lovable the
-- client files the same report against the reporter in user_reports, which
-- the admin Reports page already lists.

CREATE TABLE IF NOT EXISTS public.words_word_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lang text NOT NULL,
  word text NOT NULL,
  level int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.words_word_reports ENABLE ROW LEVEL SECURITY;

-- Anyone signed in may file a report as themselves; a guest may file one
-- with no user. Nobody reads them from the client — the admin pages use
-- the service role.
DROP POLICY IF EXISTS "words_word_reports_insert_own" ON public.words_word_reports;
CREATE POLICY "words_word_reports_insert_own"
  ON public.words_word_reports FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS words_word_reports_word_idx ON public.words_word_reports (lang, word);
