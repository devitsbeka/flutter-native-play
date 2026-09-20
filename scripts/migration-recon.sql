-- Reconnaissance for the move off Lovable Cloud.
--
-- Read-only. Nothing here writes, locks or changes anything — it is safe to
-- run against production during play.
--
-- Paste each query into Lovable's SQL editor SEPARATELY and send the result
-- back. They are separate because query 3 references cron.job, which fails at
-- PARSE time if pg_cron is not installed — one statement, and a missing
-- extension would take the other two down with it.
--
-- Why this exists: the repo cannot see the live database, and two things are
-- already known to have drifted from it —
--   * search-question-image is deployed but is in no migration and no
--     supabase/functions/ directory,
--   * translate-questions documents itself as "driven by pg_cron every few
--     minutes" and NO migration in this repo contains a cron.schedule call.
-- So the schedule that runs the translation backfill exists only in the live
-- database. Rebuilding from supabase/migrations/ alone would silently ship an
-- app whose question bank stops translating, with nothing in any log to say
-- why. Queries 2 and 3 are how we find the rest of that class of thing.


-- =========================================================================
-- QUERY 1 — exact row count for every table in public.
--
-- Not n_live_tup: that is an estimate from the stats collector and can be
-- wildly wrong on a table that was bulk-loaded. This runs a real count(*) per
-- table via query_to_xml, which is exact. It is the number we will compare
-- against after the copy to prove nothing was lost.
-- =========================================================================
SELECT relname AS table_name,
       (xpath('/row/cnt/text()', xml_count))[1]::text::bigint AS exact_rows
FROM (
  SELECT relname,
         query_to_xml(format('SELECT count(*) AS cnt FROM public.%I', relname),
                      false, true, '') AS xml_count
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
) t
ORDER BY exact_rows DESC NULLS LAST;


-- =========================================================================
-- QUERY 2 — everything that is not a public table.
--
-- Auth users, storage objects per bucket, installed extensions, the realtime
-- publication, database size, and the SECURITY DEFINER surface. Each of these
-- lives outside the migrations or is only partially described by them.
-- =========================================================================
SELECT jsonb_pretty(jsonb_build_object(
  'db_size', pg_size_pretty(pg_database_size(current_database())),

  'auth_users', (SELECT count(*) FROM auth.users),
  'auth_users_with_password', (SELECT count(*) FROM auth.users
                               WHERE encrypted_password IS NOT NULL
                                 AND encrypted_password <> ''),
  'auth_identities_by_provider', (SELECT jsonb_object_agg(provider, n)
                                  FROM (SELECT provider, count(*) n
                                        FROM auth.identities GROUP BY 1) x),

  'storage_buckets', (SELECT jsonb_agg(jsonb_build_object(
                        'id', b.id, 'public', b.public,
                        'objects', (SELECT count(*) FROM storage.objects o
                                    WHERE o.bucket_id = b.id),
                        'bytes', (SELECT pg_size_pretty(COALESCE(
                                    sum((o.metadata->>'size')::bigint), 0))
                                  FROM storage.objects o
                                  WHERE o.bucket_id = b.id)))
                      FROM storage.buckets b),

  'extensions', (SELECT jsonb_agg(jsonb_build_object('name', extname,
                                                     'schema', n.nspname))
                 FROM pg_extension e
                 JOIN pg_namespace n ON n.oid = e.extnamespace),

  'realtime_tables', (SELECT jsonb_agg(tablename)
                      FROM pg_publication_tables
                      WHERE pubname = 'supabase_realtime'),

  'public_functions', (SELECT count(*) FROM pg_proc p
                       JOIN pg_namespace n ON n.oid = p.pronamespace
                       WHERE n.nspname = 'public'),
  'security_definer_functions', (SELECT count(*) FROM pg_proc p
                                 JOIN pg_namespace n ON n.oid = p.pronamespace
                                 WHERE n.nspname = 'public' AND p.prosecdef),

  'rls_disabled_tables', (SELECT jsonb_agg(relname)
                          FROM pg_class c
                          JOIN pg_namespace n ON n.oid = c.relnamespace
                          WHERE n.nspname = 'public' AND c.relkind = 'r'
                            AND NOT c.relrowsecurity),

  'triggers_on_auth_or_storage', (SELECT jsonb_agg(jsonb_build_object(
                                    'table', c.relname, 'trigger', t.tgname))
                                  FROM pg_trigger t
                                  JOIN pg_class c ON c.oid = t.tgrelid
                                  JOIN pg_namespace n ON n.oid = c.relnamespace
                                  WHERE n.nspname IN ('auth', 'storage')
                                    AND NOT t.tgisinternal)
));


-- =========================================================================
-- QUERY 3 — scheduled jobs. Run this one on its own.
--
-- translate-questions says pg_cron drives it and no migration schedules it,
-- so whatever comes back here is invisible to the repo and has to be
-- recreated by hand on the new project. The command column usually carries
-- the function URL and the shared secret header, so treat the output as
-- sensitive.
-- =========================================================================
SELECT jobid, jobname, schedule, active, left(command, 300) AS command
FROM cron.job
ORDER BY jobid;
