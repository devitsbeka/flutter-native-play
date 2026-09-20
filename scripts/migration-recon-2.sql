-- Follow-up recon: the definitions of the two objects that exist only in
-- Lovable's database.
--
-- The replay (docs/LOVABLE_EXIT_PLAN.md §6) found that `quiz_post_comments`
-- and `tv_players.is_active` are live and are created by no migration in this
-- repo. To write them as migrations, we need what they actually look like —
-- and only the live database knows.
--
-- Read-only. Paste each into Lovable's SQL editor and send the output back.


-- =========================================================================
-- QUERY A — everything about quiz_post_comments.
--
-- Columns, constraints, indexes, policies and triggers in one result, so it
-- comes back as a single paste rather than five. `kind` says which is which.
-- =========================================================================
SELECT 'column' AS kind,
       column_name AS name,
       format('%s%s%s', data_type,
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
              CASE WHEN column_default IS NOT NULL
                   THEN ' DEFAULT ' || column_default ELSE '' END) AS detail
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'quiz_post_comments'

UNION ALL
SELECT 'constraint', c.conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
WHERE c.conrelid = 'public.quiz_post_comments'::regclass

UNION ALL
SELECT 'index', indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'quiz_post_comments'

UNION ALL
SELECT 'policy', policyname,
       format('%s TO %s USING (%s)%s', cmd, roles::text,
              COALESCE(qual, '-'),
              CASE WHEN with_check IS NOT NULL
                   THEN ' WITH CHECK (' || with_check || ')' ELSE '' END)
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'quiz_post_comments'

UNION ALL
SELECT 'trigger', t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
WHERE t.tgrelid = 'public.quiz_post_comments'::regclass
  AND NOT t.tgisinternal

UNION ALL
SELECT 'rls_enabled', 'quiz_post_comments', c.relrowsecurity::text
FROM pg_class c WHERE c.oid = 'public.quiz_post_comments'::regclass

UNION ALL
SELECT 'grant', grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'quiz_post_comments'

ORDER BY 1, 2;


-- =========================================================================
-- QUERY B — the tv_players column that no migration defines.
--
-- Three migrations read it, the CREATE TABLE at 20260106235326_… does not
-- create it, and no ADD COLUMN anywhere in the 368 files adds it.
-- =========================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tv_players'
ORDER BY ordinal_position;
