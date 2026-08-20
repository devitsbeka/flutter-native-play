-- Ledger of every scheduled/social push sent, one row per (user, kind, send).
--
-- This table is what makes the notification schedule polite instead of
-- spammy: the scheduled-pushes function checks it before sending (one
-- engagement push per day, lives-refill capped at two, win-back stages fired
-- once ever), and the unique index below makes event pushes idempotent when
-- a client retries or a cron window re-fires.
--
-- Service-role only. RLS is enabled with NO policies on purpose: clients
-- have no business reading who was nudged when, and certainly none writing
-- rows that would silence or unleash the scheduler.

CREATE TABLE IF NOT EXISTS public.push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  -- Event identity for transactional pushes (friendship id, attempt id):
  -- the unique index turns "send exactly once per event" into a constraint.
  detail text,
  sent_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS push_log_user_kind_day_idx
  ON public.push_log (user_id, kind, sent_on);

CREATE UNIQUE INDEX IF NOT EXISTS push_log_kind_detail_uniq
  ON public.push_log (kind, detail)
  WHERE detail IS NOT NULL;
