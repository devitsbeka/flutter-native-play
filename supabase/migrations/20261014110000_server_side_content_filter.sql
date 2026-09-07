-- Guideline 1.2: the text screen stops being a suggestion.
--
-- `containsBlockedText` (src/utils/contentFilter.ts, now a forwarder to
-- supabase/functions/_shared/contentFilter.ts) has screened nicknames, room
-- names, quiz titles and question text since the moderation pass — in the
-- React app, and only there. Every one of those columns is writable by a
-- signed-in client through PostgREST, and the anon key ships inside the iOS
-- binary by design, so the screen was a UI convention rather than a rule:
-- one `curl` with the key from the app bundle set a slur as a public display
-- name, and `register-username` (verify_jwt = false, length-and-no-@ only)
-- did the same from signed out.
--
-- This migration puts the same list where it cannot be skipped: a table of
-- terms, a matcher that reproduces the TypeScript one, and BEFORE INSERT OR
-- UPDATE triggers on the four tables that carry player-authored text other
-- people read.
--
-- WHY A TABLE AND NOT AN ARRAY IN THE FUNCTION BODY. Both work; the table
-- wins on the thing that actually costs here. Migrations and edge functions
-- in this project deploy through Lovable (CLAUDE.md 4a) — nobody has CLI or
-- dashboard access — so "add one word to the blocklist" as an array constant
-- means a new migration file, a merge to main, and asking Lovable for a
-- deploy. As a table it is one INSERT an admin can paste into the SQL editor
-- the moment a report names a word, which is the response time the Terms of
-- Service promise. The table is small, read inside a trigger that Postgres
-- caches the plan for, and locked behind RLS with no policies so no client
-- can read the list and machine-test around it.
--
-- The list is duplicated from TypeScript, because Postgres cannot import it.
-- `src/__tests__/blocklistIsOneList.test.ts` parses both files and fails if
-- they ever disagree, so the duplication cannot silently rot.
--
-- Everything here is re-runnable.


-- ---------------------------------------------------------------------------
-- 1. Normalisers — the SQL twins of normalize()/tokenize() in contentFilter.ts
-- ---------------------------------------------------------------------------

-- Lowercase, map leetspeak, drop separators. "S.h.1.t" and "sh1t" both become
-- "shit". This is what SUBSTRING terms are matched against.
CREATE OR REPLACE FUNCTION public.moderation_normalize(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT regexp_replace(
           translate(lower(coalesce(p_text, '')), '013457@$!', 'oieastasi'),
           '[[:space:]._*+,''"`~^|/\\\()\[\]{}-]+', '', 'g')
$fn$;

-- Split into words the way the client does: leet mapped, runs of 3+ of the
-- same letter collapsed to one ("fuuuck" -> "fuck", "bookkeeper" intact),
-- split on real word boundaries, other punctuation stripped inside a token
-- ("F.u.c.k" -> "fuck") — and a run of 3 or more single-character tokens
-- joined into an extra candidate, which is the "f u c k" spelling.
CREATE OR REPLACE FUNCTION public.moderation_tokens(p_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_clean   text;
  v_raw     text[];
  v_out     text[] := ARRAY[]::text[];
  v_run     text := '';
  v_run_len int := 0;
  v_tok     text;
BEGIN
  v_clean := regexp_replace(
    translate(lower(coalesce(p_text, '')), '013457@$!', 'oieastasi'),
    '([[:alpha:]])\1{2,}', '\1', 'g');

  v_raw := regexp_split_to_array(v_clean, '[[:space:]_/\\\|-]+');

  FOREACH v_tok IN ARRAY v_raw LOOP
    v_tok := regexp_replace(v_tok, '[^[:alnum:]]+', '', 'g');
    CONTINUE WHEN v_tok = '';
    v_out := v_out || v_tok;
    IF length(v_tok) = 1 THEN
      v_run := v_run || v_tok;
      v_run_len := v_run_len + 1;
    ELSE
      IF v_run_len >= 3 THEN
        v_out := v_out || v_run;
      END IF;
      v_run := '';
      v_run_len := 0;
    END IF;
  END LOOP;

  IF v_run_len >= 3 THEN
    v_out := v_out || v_run;
  END IF;

  RETURN v_out;
END;
$fn$;

-- Every token plus its suffix-stripped forms, so "bitches" matches "bitch"
-- and "retarded" matches "retard". WORD terms are matched against this set.
CREATE OR REPLACE FUNCTION public.moderation_word_candidates(p_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_out text[] := ARRAY[]::text[];
  v_tok text;
BEGIN
  FOREACH v_tok IN ARRAY public.moderation_tokens(p_text) LOOP
    v_out := v_out || v_tok;
    IF v_tok LIKE '%es' THEN v_out := v_out || left(v_tok, -2); END IF;
    IF v_tok LIKE '%s'  THEN v_out := v_out || left(v_tok, -1); END IF;
    IF v_tok LIKE '%ed' THEN v_out := v_out || left(v_tok, -2); END IF;
    IF v_tok LIKE '%ing' THEN v_out := v_out || left(v_tok, -3); END IF;
  END LOOP;
  RETURN v_out;
END;
$fn$;


-- ---------------------------------------------------------------------------
-- 2. The list
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blocked_terms (
  term        text PRIMARY KEY,
  -- 'substring': disqualifying anywhere in the text, even inside a word.
  -- 'word':      too short or too common to match loosely — whole words only,
  --              which is what keeps "Scunthorpe" and "Coon Rapids" playable.
  match_kind  text NOT NULL CHECK (match_kind IN ('substring', 'word')),
  -- Filled by the trigger below so an admin adding a term types the term and
  -- nothing else. Storing it means the matcher normalises the input once per
  -- row checked instead of once per term per row checked.
  normalized  text NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.blocked_terms_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  NEW.normalized := CASE NEW.match_kind
    WHEN 'substring' THEN public.moderation_normalize(NEW.term)
    ELSE array_to_string(public.moderation_tokens(NEW.term), '')
  END;
  IF NEW.normalized = '' THEN
    RAISE EXCEPTION 'blocked_terms.term normalises to nothing: %', NEW.term;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS blocked_terms_normalize ON public.blocked_terms;
CREATE TRIGGER blocked_terms_normalize
  BEFORE INSERT OR UPDATE ON public.blocked_terms
  FOR EACH ROW EXECUTE FUNCTION public.blocked_terms_normalize();

-- Nobody reads this table but the matcher. Published, it is a dictionary of
-- exactly which spellings to avoid — a bypass checklist. RLS on with no
-- policies means anon and authenticated see zero rows; the SECURITY DEFINER
-- matcher below runs as the owner and sees all of them.
ALTER TABLE public.blocked_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blocked_terms FROM PUBLIC;
REVOKE ALL ON public.blocked_terms FROM anon, authenticated;
GRANT ALL ON public.blocked_terms TO service_role;

-- Seeded from supabase/functions/_shared/contentFilter.ts. Keep them equal —
-- src/__tests__/blocklistIsOneList.test.ts asserts it.
INSERT INTO public.blocked_terms (term, match_kind) VALUES
  ('nigger', 'substring'),
  ('nigga', 'substring'),
  ('faggot', 'substring'),
  ('motherfucker', 'substring'),
  ('cocksucker', 'substring'),
  ('childporn', 'substring'),
  ('შეყლე', 'substring'),
  ('ყლეობ', 'substring'),
  ('მუტელ', 'substring'),
  ('ტრაკში', 'substring'),
  ('შემეცი', 'substring'),
  ('მოგიტყან', 'substring'),
  ('მოგტყან', 'substring'),
  ('გიჟინ', 'substring'),
  ('დედამოტყნულ', 'substring'),
  ('დედაშენს', 'substring'),
  ('შენი დედა', 'substring'),
  ('ბოზო', 'substring'),
  ('ბოზი', 'substring'),
  ('ყლეზე', 'substring'),
  ('shechame', 'substring'),
  ('mutel', 'substring'),
  ('traki shen', 'substring'),
  ('mogityan', 'substring'),
  ('dedamotynul', 'substring'),
  ('bozo shen', 'substring'),
  ('пизд', 'substring'),
  ('хуе', 'substring'),
  ('ебан', 'substring'),
  ('ебат', 'substring'),
  ('заеб', 'substring'),
  ('шлюха', 'substring'),
  ('долбо', 'substring'),
  ('fuck', 'word'),
  ('fucker', 'word'),
  ('fucking', 'word'),
  ('shit', 'word'),
  ('cunt', 'word'),
  ('whore', 'word'),
  ('slut', 'word'),
  ('bitch', 'word'),
  ('retard', 'word'),
  ('rapist', 'word'),
  ('ყლე', 'word'),
  ('ბოზ', 'word'),
  ('მუტლ', 'word'),
  ('ტყნავ', 'word'),
  ('ძუკნა', 'word'),
  ('ნაბოზვარ', 'word'),
  ('დაუნ', 'word'),
  ('yle', 'word'),
  ('boz', 'word'),
  ('dzukna', 'word'),
  ('nabozvar', 'word'),
  ('fuk', 'word'),
  ('phuck', 'word'),
  ('fck', 'word'),
  ('tranny', 'word'),
  ('kys', 'word'),
  ('paki', 'word'),
  ('chink', 'word'),
  ('spic', 'word'),
  ('kike', 'word'),
  ('бля', 'word'),
  ('сука', 'word'),
  ('хуй', 'word'),
  ('мудак', 'word')
ON CONFLICT (term) DO UPDATE SET match_kind = EXCLUDED.match_kind;


-- ---------------------------------------------------------------------------
-- 3. The matcher
-- ---------------------------------------------------------------------------

-- The SQL twin of containsBlockedText(). Empty input is clean: emptiness is
-- the caller's own validation, not a moderation verdict.
CREATE OR REPLACE FUNCTION public.contains_blocked_text(p_text text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_norm  text;
  v_words text[];
  v_hit   boolean;
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RETURN false;
  END IF;

  v_norm := public.moderation_normalize(p_text);
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_terms b
    WHERE b.match_kind = 'substring' AND position(b.normalized IN v_norm) > 0
  ) INTO v_hit;
  IF v_hit THEN
    RETURN true;
  END IF;

  v_words := public.moderation_word_candidates(p_text);
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_terms b
    WHERE b.match_kind = 'word' AND b.normalized = ANY (v_words)
  ) INTO v_hit;

  RETURN v_hit;
END;
$fn$;


-- ---------------------------------------------------------------------------
-- 4. The trigger that refuses the write
-- ---------------------------------------------------------------------------

-- Column names come from TG_ARGV, so one function guards every table. On
-- UPDATE only a CHANGED value is checked: rows that predate this migration
-- and already carry something blocked must stay editable in their other
-- columns, or a room created last week becomes unplayable — a moderator
-- clears the offending name through admin_remove_reported_content instead.
CREATE OR REPLACE FUNCTION public.reject_blocked_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_col text;
  v_new text;
  v_old text;
BEGIN
  FOREACH v_col IN ARRAY TG_ARGV LOOP
    EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_new USING NEW;

    IF TG_OP = 'UPDATE' THEN
      EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_old USING OLD;
      CONTINUE WHEN v_new IS NOT DISTINCT FROM v_old;
    END IF;

    IF public.contains_blocked_text(v_new) THEN
      RAISE EXCEPTION 'blocked_text: %.% contains text that is not allowed',
        TG_TABLE_NAME, v_col
        USING ERRCODE = 'check_violation',
              HINT = 'This text is not allowed. Please choose another.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$fn$;

-- profiles.nickname — the public display name, on every leaderboard.
DROP TRIGGER IF EXISTS profiles_reject_blocked_text ON public.profiles;
CREATE TRIGGER profiles_reject_blocked_text
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_text('nickname');

-- game_rooms — the room name rides push notifications; the team names are
-- painted over the scoreboard.
DROP TRIGGER IF EXISTS game_rooms_reject_blocked_text ON public.game_rooms;
CREATE TRIGGER game_rooms_reject_blocked_text
  BEFORE INSERT OR UPDATE ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_text(
    'room_name', 'team_a_name', 'team_b_name');

-- tv_sessions — rendered at 3xl on a television in somebody's living room.
DROP TRIGGER IF EXISTS tv_sessions_reject_blocked_text ON public.tv_sessions;
CREATE TRIGGER tv_sessions_reject_blocked_text
  BEFORE INSERT OR UPDATE ON public.tv_sessions
  FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_text(
    'room_name', 'game_name');

-- user_quiz_posts — the public feed. The questions themselves are a jsonb
-- blob a trigger cannot read column-wise; they are screened where they are
-- authored, in generate-custom-quiz and generate-single-question.
DROP TRIGGER IF EXISTS user_quiz_posts_reject_blocked_text ON public.user_quiz_posts;
CREATE TRIGGER user_quiz_posts_reject_blocked_text
  BEFORE INSERT OR UPDATE ON public.user_quiz_posts
  FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_text(
    'title', 'subject', 'description');


-- ---------------------------------------------------------------------------
-- 5. Grants (CLAUDE.md rule 3: SECURITY DEFINER is granted to PUBLIC by
--    default — revoke first, then grant deliberately)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.moderation_normalize(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderation_tokens(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderation_word_candidates(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contains_blocked_text(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.blocked_terms_normalize() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_blocked_text() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.moderation_normalize(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.moderation_tokens(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.moderation_word_candidates(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.contains_blocked_text(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.blocked_terms_normalize() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_text() FROM anon, authenticated;

-- Trigger functions need no runtime EXECUTE grant — Postgres checks that
-- privilege when the trigger is CREATEd, not when it fires — so the two
-- trigger functions above stay granted to nobody. The matcher goes to
-- service_role only, for edge functions and admin SQL. A client that could
-- call it could ask "is this word blocked?" one word at a time and rebuild
-- the list, which is exactly what the RLS on the table is preventing.
GRANT EXECUTE ON FUNCTION public.contains_blocked_text(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.moderation_normalize(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.moderation_tokens(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.moderation_word_candidates(text) TO service_role;
