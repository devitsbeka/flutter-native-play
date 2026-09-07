-- Account deletion backstop — App Store guideline 5.1.1(v).
--
-- `delete-user-account` now deletes every table that holds personal data
-- explicitly. This migration is the safety net underneath it: the tables
-- below were created with a bare `user_id UUID NOT NULL` and no foreign
-- key at all, so when a user was removed from `auth.users` — by the edge
-- function, by the dashboard, or by a hand-written script — their rows in
-- these tables simply stayed behind, unreferenced and unreachable. There
-- is no AFTER DELETE trigger on auth.users either. Nothing cascaded.
--
-- Adding the foreign key means a future deletion path that forgets a
-- table still removes the rows.
--
-- Two deliberate choices:
--
-- * `NOT VALID`. These tables already contain rows pointing at users who
--   were deleted before this migration, so a validating ALTER would fail
--   outright. NOT VALID skips only the scan of existing rows — the
--   referential-action triggers are installed either way, so ON DELETE
--   CASCADE fires for old and new rows alike, and new inserts are still
--   checked. (Once the orphans are cleaned up the constraints can be
--   validated with ALTER TABLE ... VALIDATE CONSTRAINT.)
--
-- * Everything is guarded, so re-running is a no-op and a table that does
--   not exist in a given environment is skipped rather than fatal.
--   `quiz_post_comments` in particular was created outside this
--   migrations directory.
--
-- Not touched here: `gem_purchases` and `purchase_transactions` already
-- carry foreign keys (to auth.users and profiles respectively) with no
-- delete action, which makes them a hard stop rather than a silent leak —
-- deletion fails loudly if they are ever skipped. Money tables stay as
-- they are.

DO $$
DECLARE
  fk RECORD;
  target_col_attnum smallint;
  constraint_name text;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('push_tokens',             'user_id',          'CASCADE'),
      ('user_quiz_posts',         'user_id',          'CASCADE'),
      ('quiz_collections',        'user_id',          'CASCADE'),
      ('quiz_post_comments',      'user_id',          'CASCADE'),
      ('quiz_post_likes',         'user_id',          'CASCADE'),
      ('quiz_post_plays',         'user_id',          'CASCADE'),
      ('quiz_post_saves',         'user_id',          'CASCADE'),
      ('game_plays',              'user_id',          'CASCADE'),
      ('category_weekly_rewards', 'user_id',          'CASCADE'),
      ('trivia_drafts',           'user_id',          'CASCADE'),
      ('collection_drafts',       'user_id',          'CASCADE'),
      ('cover_image_generations', 'user_id',          'CASCADE'),
      ('friend_invites',          'inviter_id',       'CASCADE'),
      -- Nullable, and the row belongs to the inviter: blank the reference
      -- rather than destroying their invite record.
      ('friend_invites',          'invited_user_id',  'SET NULL')
    ) AS t(tbl, col, act)
  LOOP
    -- Table present?
    IF to_regclass('public.' || quote_ident(fk.tbl)) IS NULL THEN
      RAISE NOTICE 'account-deletion cascade: table public.% not present, skipping', fk.tbl;
      CONTINUE;
    END IF;

    -- Column present?
    SELECT a.attnum INTO target_col_attnum
    FROM pg_attribute a
    WHERE a.attrelid = to_regclass('public.' || quote_ident(fk.tbl))
      AND a.attname = fk.col
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF target_col_attnum IS NULL THEN
      RAISE NOTICE 'account-deletion cascade: public.%.% not present, skipping', fk.tbl, fk.col;
      CONTINUE;
    END IF;

    -- Already has a foreign key on that exact column to auth.users?
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = to_regclass('public.' || quote_ident(fk.tbl))
        AND c.contype = 'f'
        AND c.confrelid = 'auth.users'::regclass
        AND c.conkey = ARRAY[target_col_attnum]
    ) THEN
      RAISE NOTICE 'account-deletion cascade: public.%.% already references auth.users, skipping', fk.tbl, fk.col;
      CONTINUE;
    END IF;

    constraint_name := fk.tbl || '_' || fk.col || '_auth_users_fkey';

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE %s NOT VALID',
      fk.tbl, constraint_name, fk.col, fk.act
    );

    RAISE NOTICE 'account-deletion cascade: added % on public.%.%', constraint_name, fk.tbl, fk.col;
  END LOOP;
END $$;
