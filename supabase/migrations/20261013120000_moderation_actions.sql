-- Guideline 1.2: make a report land, make it name what it is about, and give
-- an admin something to do with it.
--
-- Three defects, all of them live:
--
-- 1. TWO REPORT FLOWS WERE REJECTED BY THIS TABLE AND LIED ABOUT IT.
--    `report_type`'s CHECK (20260105144642) lists five values. The flag under
--    a King reveal files 'king_question' (src/utils/kingQuestionReport.ts) and
--    the Words word modal files 'words_word'
--    (src/features/words/WordInfoModal.tsx). Both are rejected with 23514, and
--    both call sites caught the error, dropped it into console.warn and showed
--    the player "report received". The admin Reports page carries labels and
--    filter entries for two types it could never receive. The CHECK is
--    recreated below with the values the client actually files.
--
-- 2. A REPORT NAMED A PERSON AND NOTHING ELSE. `reported_user_id` is NOT NULL,
--    and the only other handle was `message_id`, used loosely for whatever the
--    caller had. A report about a quiz was therefore a report about its author
--    with the quiz described, at best, in prose. `content_type` / `content_id`
--    below are the pair the new quiz- and room-level report buttons write, and
--    they are what `admin_remove_reported_content` acts on. `message_id` and
--    `room_id` stay, and the function still falls back to them, so nothing
--    already filed becomes unactionable.
--
-- 3. NOTHING COULD BE DONE WITH A REPORT ONCE IT ARRIVED. The Reports page's
--    only write set `status` and `reviewed_at`. There was no way to unpublish
--    a reported quiz, clear an offending nickname or avatar, or eject the
--    author — while the Terms of Service promise that offensive content is
--    "reviewed and removed within 24 hours, and users who post it are
--    ejected". The two SECURITY DEFINER functions at the bottom are that
--    promise, gated on the admin role, and a trigger tells the admins a report
--    arrived instead of waiting for someone to open the page.
--
-- Everything here is written to be re-runnable.


-- ---------------------------------------------------------------------------
-- 1. The report types the client actually files
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_report_type_check;

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_report_type_check
  CHECK (report_type IN (
    -- what a person picks in the report sheet
    'spam', 'harassment', 'inappropriate', 'cheating', 'other',
    -- and the two content-quality flags, which are filed against the reporter
    -- themselves because a bad puzzle is not a person: read the description.
    'king_question', 'words_word'
  ));


-- ---------------------------------------------------------------------------
-- 2. What the report is about
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS content_id   uuid;

ALTER TABLE public.user_reports
  DROP CONSTRAINT IF EXISTS user_reports_content_type_check;

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_content_type_check
  CHECK (content_type IS NULL OR content_type IN ('quiz', 'room', 'message', 'profile'));

CREATE INDEX IF NOT EXISTS user_reports_content_idx
  ON public.user_reports (content_type, content_id);

-- The queue is read newest-pending-first, on every open of the page.
CREATE INDEX IF NOT EXISTS user_reports_status_created_idx
  ON public.user_reports (status, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. Suspension — the flag "ejected" has to mean something
-- ---------------------------------------------------------------------------
--
-- No column for this existed anywhere in the schema. NOTE FOR WHOEVER PICKS
-- THIS UP: the client does not yet enforce it. Setting it hides the account's
-- public quizzes (admin_set_user_suspended does that in the same statement)
-- and records the decision, but nothing in the app refuses a suspended user a
-- session, a room or a chat message yet. That belongs in the auth/session
-- path, not here.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at     timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by     uuid;

-- profiles' SELECT grant is column-by-column (20260731000000), so a new column
-- is invisible to clients until it is named. The flag itself should be
-- readable — that is how the app will one day honour it — while the reason and
-- the admin who set it stay private.
GRANT SELECT (suspended_at) ON public.profiles TO anon, authenticated;

-- "Users can update their own profile" is a whole-row UPDATE policy, so
-- without this a suspended player could clear their own suspension with one
-- PATCH. A column-level REVOKE would be a silent no-op while the table-level
-- UPDATE grant stands (the trap documented in 20260731000000), and re-granting
-- UPDATE column by column would break the next time anyone adds a column. So
-- the three columns are pinned by a trigger instead: a client write may carry
-- them, it just cannot change them.
CREATE OR REPLACE FUNCTION public.pin_profile_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Every profile write passes through here, so the role lookup only happens
  -- when one of the three columns is actually being changed.
  IF NEW.suspended_at     IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
     OR NEW.suspended_by     IS DISTINCT FROM OLD.suspended_by THEN
    -- auth.uid() IS NULL is the service role, this migration, and the SQL
    -- editor. An admin is allowed through so the functions below can write.
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.suspended_at     := OLD.suspended_at;
      NEW.suspended_reason := OLD.suspended_reason;
      NEW.suspended_by     := OLD.suspended_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_pin_suspension ON public.profiles;
CREATE TRIGGER profiles_pin_suspension
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.pin_profile_suspension();


-- ---------------------------------------------------------------------------
-- 4. Remove the content
-- ---------------------------------------------------------------------------
--
-- Soft where the schema has a soft flag, which is everywhere except chat:
--   quiz -> user_quiz_posts.is_public = false  (the row, its questions and its
--           play history survive; it leaves every feed)
--   room -> game_rooms.is_public = false, is_archived = true
--   message -> room_chat_messages has no deleted flag and no place to put one
--           that readers already honour, so the row goes.
--   profile -> nickname reset and both avatars cleared. The account and its
--           history stay; what was offensive is what is removed.
--
-- p_target: 'content' | 'profile' | 'auto'. 'auto' removes the named content
-- if the report names any, and otherwise falls back to the profile, which is
-- what a report with no content attached is always about.
--
-- Never touches the profile when reporter and reported are the same person:
-- that pair is the king_question / words_word stand-in, not an accusation.

CREATE OR REPLACE FUNCTION public.admin_remove_reported_content(
  p_report_id uuid,
  p_target    text DEFAULT 'auto'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_rep   public.user_reports%ROWTYPE;
  v_kind  text;
  v_id    uuid;
  v_done  text[] := ARRAY[]::text[];
  v_n     integer;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_target IS NULL OR p_target NOT IN ('auto', 'content', 'profile') THEN
    RAISE EXCEPTION 'unknown target: %', p_target;
  END IF;

  SELECT * INTO v_rep FROM public.user_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found';
  END IF;

  -- What this report names. New reports carry content_type/content_id; older
  -- ones carry message_id or room_id and nothing else.
  v_kind := v_rep.content_type;
  v_id   := v_rep.content_id;
  IF v_id IS NULL AND v_rep.message_id IS NOT NULL THEN
    v_kind := 'message';
    v_id   := v_rep.message_id;
  END IF;
  IF v_id IS NULL AND v_rep.room_id IS NOT NULL THEN
    v_kind := 'room';
    v_id   := v_rep.room_id;
  END IF;

  IF p_target IN ('auto', 'content') AND v_id IS NOT NULL THEN
    IF v_kind = 'quiz' THEN
      UPDATE public.user_quiz_posts
         SET is_public = false, updated_at = now()
       WHERE id = v_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_done := v_done || 'quiz_unpublished'; END IF;

    ELSIF v_kind = 'room' THEN
      UPDATE public.game_rooms
         SET is_public = false, is_archived = true
       WHERE id = v_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_done := v_done || 'room_closed'; END IF;

    ELSIF v_kind = 'message' THEN
      DELETE FROM public.room_chat_messages WHERE id = v_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_done := v_done || 'message_deleted'; END IF;
    END IF;
  END IF;

  IF p_target = 'profile'
     OR (p_target = 'auto' AND array_length(v_done, 1) IS NULL) THEN
    IF v_rep.reported_user_id IS DISTINCT FROM v_rep.reporter_id THEN
      UPDATE public.profiles
         SET nickname            = 'Player ' || left(replace(user_id::text, '-', ''), 6),
             avatar_url          = NULL,
             animated_avatar_url = NULL,
             updated_at          = now()
       WHERE user_id = v_rep.reported_user_id;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN v_done := v_done || 'profile_cleared'; END IF;
    END IF;
  END IF;

  UPDATE public.user_reports
     SET status      = 'resolved',
         reviewed_at = now(),
         reviewed_by = v_admin
   WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'report_id',    p_report_id,
    'content_type', v_kind,
    'content_id',   v_id,
    'actions',      to_jsonb(v_done)
  );
END;
$$;

-- A new SECURITY DEFINER function is executable by PUBLIC by default, which
-- for this one would mean "anybody may unpublish anybody's quiz". See
-- CLAUDE.md rule 3. The body checks the admin role as well: the grant decides
-- who may call, the check decides who may act.
REVOKE ALL ON FUNCTION public.admin_remove_reported_content(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_reported_content(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_reported_content(uuid, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. Eject the author
-- ---------------------------------------------------------------------------
--
-- Reversible on purpose — p_suspended = false lifts it — because the only
-- alternative anyone reaches for otherwise is deleting the account.
-- Suspending also unpublishes everything the account has posted publicly,
-- which is the part that takes effect immediately; the flag itself waits on
-- the client (see the note in section 3).

CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(
  p_user_id   uuid,
  p_suspended boolean DEFAULT true,
  p_reason    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin  uuid := auth.uid();
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
  v_quizzes integer := 0;
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'no user';
  END IF;

  IF p_user_id = v_admin THEN
    RAISE EXCEPTION 'cannot suspend yourself';
  END IF;

  UPDATE public.profiles
     SET suspended_at     = CASE WHEN p_suspended THEN now()    ELSE NULL END,
         suspended_reason = CASE WHEN p_suspended THEN v_reason ELSE NULL END,
         suspended_by     = CASE WHEN p_suspended THEN v_admin  ELSE NULL END,
         updated_at       = now()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF p_suspended THEN
    -- Ejection has to reach the content, or the account is only muted in
    -- theory. Unpublishing is reversible by the author, deliberately: lifting
    -- a suspension does not silently republish, and does not have to guess
    -- which quizzes were public before.
    UPDATE public.user_quiz_posts
       SET is_public = false, updated_at = now()
     WHERE user_id = p_user_id AND is_public;
    GET DIAGNOSTICS v_quizzes = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'user_id',            p_user_id,
    'suspended',          p_suspended,
    'quizzes_unpublished', v_quizzes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 6. Tell a human a report arrived
-- ---------------------------------------------------------------------------
--
-- Nothing did. A report sat in a table until somebody happened to open the
-- admin page, which is not a 24-hour review promise. Every admin gets a
-- notification row, which is the same inbox the app already renders.
--
-- The insert is wrapped: filing a report must never fail because the
-- notification could not be written. The report is the thing that matters.

CREATE OR REPLACE FUNCTION public.notify_admins_of_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT ur.user_id,
           'moderation_report',
           'New content report',
           left(COALESCE(NULLIF(btrim(NEW.description), ''), NEW.report_type), 140),
           jsonb_build_object(
             'report_id',        NEW.id,
             'report_type',      NEW.report_type,
             'content_type',     NEW.content_type,
             'content_id',       NEW.content_id,
             'reported_user_id', NEW.reported_user_id)
      FROM public.user_roles ur
     WHERE ur.role = 'admin'::app_role;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_reports_notify_admins ON public.user_reports;
CREATE TRIGGER user_reports_notify_admins
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_report();
