-- Put translate-questions on a schedule.
--
-- It was never on one. `select jobname from cron.job` returns exactly two
-- rows — cleanup-old-rooms-daily and scheduled-pushes — and the function's
-- own header says "Driven by pg_cron every few minutes", which nothing has
-- ever done. The 8,696 rows in each of German, Spanish, French, Italian and
-- Portuguese were produced by someone invoking it by hand until it caught up,
-- and it has sat idle since.
--
-- That is fine while the English bank is static and awful the moment it is
-- not: every question the generation job writes from now on is English-only
-- until somebody remembers to run the translator again. And Georgian, which
-- has just become the first target, is 1,312 rows behind with nothing to move
-- it.
--
-- Five minutes matches the function's own design: a run is budgeted to finish
-- inside 50 seconds, and it is stateless — "where are we?" is re-derived from
-- what is already in the table — so an extra run costs one cheap query and a
-- 204.
--
-- ---------------------------------------------------------------------------
-- BEFORE RUNNING: replace PASTE_TRANSLATE_SECRET_HERE below.
--
-- The function refuses any call whose x-cron-secret header does not match its
-- TRANSLATE_SECRET. Copy that value from the Secrets tab (Cloud → Secrets) and
-- paste it in place of the placeholder. If there is no TRANSLATE_SECRET there,
-- add one with any long random value first — the function reads it from the
-- environment, so whatever you set is what it will expect.
--
-- Do NOT commit the filled-in version. This file keeps the placeholder.
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'translate-questions',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/translate-questions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'PASTE_TRANSLATE_SECRET_HERE'
    ),
    body := '{}'::jsonb,
    -- The run is budgeted at 50s; give the request room to outlive it rather
    -- than reporting a failure for work that finished.
    timeout_milliseconds := 55000
  );
  $job$
);

-- ---------------------------------------------------------------------------
-- And the generation job, which has the same problem for a different reason.
--
-- run-generation-job processes ONE batch per call and then sets its own
-- next_run_at — but nothing polls it. The admin panel invokes it exactly
-- twice in its whole lifetime: once when a job is created and once when one
-- is resumed. So a 641-question job at ten per batch needs about sixty-four
-- invocations and gets two: the panel is "auto" in name only, and any job
-- larger than a couple of batches has always stalled a minute after it
-- started.
--
-- No secret here. The function's only gate is verify_jwt, and the anon key is
-- a valid JWT — it is the publishable key from .env, public by design, and it
-- buys the caller nothing on its own. Everything the function does inside it
-- does with the service-role client it builds for itself.
SELECT cron.schedule(
  'run-generation-job',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/run-generation-job',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxd3B6ZXpraHBxa2R5bHR2c2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzY5MTQsImV4cCI6MjA4MTkxMjkxNH0.tNtgf8sbZakCP6HAUtoxVSrcshZ1Lvn_1OqS7K7VhTc'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);

-- A run that has nothing to do — no job with status 'running' and a due
-- next_run_at — returns immediately, so this costs one query when idle.

-- Same name twice replaces the schedule rather than adding a second one, so
-- re-running this after changing the interval is safe.
--
-- To check it took:
--   select jobname, schedule, active from cron.job order by jobname;
--
-- To watch it work (ka should climb past 1,097 toward ~2,400):
--   select language, count(*) from questions
--    where translated_from is not null group by language order by language;
--
-- To see the runs themselves, including failures:
--   select status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'translate-questions')
--    order by start_time desc limit 10;
--
-- To stop it:
--   select cron.unschedule('translate-questions');
