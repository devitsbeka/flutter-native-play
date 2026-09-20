-- A comparable fingerprint of a database's schema.
--
-- Run this on BOTH projects — the Lovable one and ours — and compare. It is
-- the check that the rebuilt schema is the schema production actually has,
-- rather than the schema supabase/migrations/ describes. Those are not known
-- to be the same thing: 202 of the 368 migrations were written by Lovable's
-- agent, which can also apply SQL through its editor without ever writing a
-- file, and two things have already been found that exist only in the live
-- database (the search-question-image function, and whatever pg_cron runs).
--
-- Read-only on both sides.
--
-- QUERY 1 is a summary: one row per object class, with a count and an md5 of
-- every object's normalised definition. If a row's count AND hash match on
-- both databases, that entire class is identical and needs no further
-- thought. Only where a hash differs do you run QUERY 2 for that class.
--
-- The point of the hash is to keep this to a dozen rows instead of the
-- several thousand that a full object listing produces. Do not skip straight
-- to QUERY 2.


-- =========================================================================
-- QUERY 1 — the summary. Twelve rows. Run on both, compare side by side.
-- =========================================================================
WITH
columns_ AS (
  SELECT format('%s.%s:%s:%s:%s', table_schema, table_name, column_name,
                data_type, COALESCE(column_default, '-')) AS d
  FROM information_schema.columns WHERE table_schema = 'public'
),
tables_ AS (
  SELECT format('%s:%s', c.relname, c.relrowsecurity) AS d
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
views_ AS (
  SELECT format('%s:%s', c.relname, md5(pg_get_viewdef(c.oid))) AS d
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
),
functions_ AS (
  -- prosecdef is included deliberately: a function that arrives without its
  -- SECURITY DEFINER is a function that no longer enforces anything, and 152
  -- of the 166 here are the entitlement and currency surface.
  SELECT format('%s(%s):%s:%s', p.proname,
                pg_get_function_identity_arguments(p.oid),
                p.prosecdef, md5(COALESCE(p.prosrc, ''))) AS d
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
),
grants_ AS (
  -- CLAUDE.md rule 3: every money function is REVOKEd from PUBLIC and anon.
  -- A rebuild that restores the function but not the revoke reopens the door
  -- silently, so the grants are part of the schema, not a detail of it.
  SELECT format('%s:%s:%s', table_schema || '.' || table_name, grantee,
                privilege_type) AS d
  FROM information_schema.role_table_grants WHERE table_schema = 'public'
  UNION ALL
  SELECT format('routine:%s:%s:%s', routine_name, grantee, privilege_type)
  FROM information_schema.routine_privileges WHERE routine_schema = 'public'
),
policies_ AS (
  SELECT format('%s:%s:%s:%s:%s', tablename, policyname, cmd,
                md5(COALESCE(qual, '-')), md5(COALESCE(with_check, '-'))) AS d
  FROM pg_policies WHERE schemaname = 'public'
),
indexes_ AS (
  SELECT format('%s:%s', indexname, md5(indexdef)) AS d
  FROM pg_indexes WHERE schemaname = 'public'
),
constraints_ AS (
  SELECT format('%s:%s:%s', c.conrelid::regclass::text, c.conname,
                md5(pg_get_constraintdef(c.oid))) AS d
  FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public'
),
triggers_ AS (
  -- Across ALL schemas, not just public. on_auth_user_created lives on
  -- auth.users and is what creates a profile row for a new account; a
  -- database restored without it accepts sign-ups that produce no profile.
  SELECT format('%s.%s:%s:%s', n.nspname, c.relname, t.tgname,
                md5(pg_get_triggerdef(t.oid))) AS d
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
),
types_ AS (
  SELECT format('%s:%s', t.typname,
                COALESCE((SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
                          FROM pg_enum e WHERE e.enumtypid = t.oid), '-')) AS d
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e'
),
extensions_ AS (
  SELECT format('%s:%s', extname, n.nspname) AS d
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
),
realtime_ AS (
  SELECT format('%s.%s', schemaname, tablename) AS d
  FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
),
buckets_ AS (
  SELECT format('%s:%s:%s', id, public, COALESCE(file_size_limit::text, '-')) AS d
  FROM storage.buckets
)
SELECT 'columns'     AS object_class, count(*), md5(string_agg(d, '|' ORDER BY d)) FROM columns_
UNION ALL SELECT 'tables',      count(*), md5(string_agg(d, '|' ORDER BY d)) FROM tables_
UNION ALL SELECT 'views',       count(*), md5(string_agg(d, '|' ORDER BY d)) FROM views_
UNION ALL SELECT 'functions',   count(*), md5(string_agg(d, '|' ORDER BY d)) FROM functions_
UNION ALL SELECT 'grants',      count(*), md5(string_agg(d, '|' ORDER BY d)) FROM grants_
UNION ALL SELECT 'policies',    count(*), md5(string_agg(d, '|' ORDER BY d)) FROM policies_
UNION ALL SELECT 'indexes',     count(*), md5(string_agg(d, '|' ORDER BY d)) FROM indexes_
UNION ALL SELECT 'constraints', count(*), md5(string_agg(d, '|' ORDER BY d)) FROM constraints_
UNION ALL SELECT 'triggers',    count(*), md5(string_agg(d, '|' ORDER BY d)) FROM triggers_
UNION ALL SELECT 'enum_types',  count(*), md5(string_agg(d, '|' ORDER BY d)) FROM types_
UNION ALL SELECT 'extensions',  count(*), md5(string_agg(d, '|' ORDER BY d)) FROM extensions_
UNION ALL SELECT 'realtime',    count(*), md5(string_agg(d, '|' ORDER BY d)) FROM realtime_
UNION ALL SELECT 'buckets',     count(*), md5(string_agg(d, '|' ORDER BY d)) FROM buckets_
ORDER BY 1;


-- =========================================================================
-- QUERY 2 — the detail, for ONE class whose hash differed.
--
-- Replace the CTE body with the matching block from above, run on both, and
-- Export CSV. Diffing two CSVs finds the missing object in seconds; reading
-- two thousand rows by eye does not.
--
-- Example, for functions:
--
--   SELECT format('%s(%s):%s', p.proname,
--                 pg_get_function_identity_arguments(p.oid), p.prosecdef) AS d
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--   ORDER BY 1;
-- =========================================================================
