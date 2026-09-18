-- VipContext listens for changes to vip_subscriptions. Let it hear them.
--
-- The provider loads the row once on mount and otherwise waits on a realtime
-- subscription to this table. The table was never added to the
-- supabase_realtime publication, so that listener has never fired -- and the
-- only other way back, VipContext's own refresh(), had no caller anywhere in
-- the app.
--
-- The visible effect: a PRO purchase completed, verify-receipt wrote the row,
-- the success modal appeared, and the app carried on rendering the non-PRO UI
-- until it was killed and relaunched. The data was right the whole time;
-- nothing ever asked for it again.
--
-- The client now calls refresh() itself after a purchase or restore, which is
-- the deterministic half. This is the other half: it also covers the changes
-- the client does not make -- the RevenueCat webhook renewing or cancelling a
-- subscription, an admin grant, grant_vip_days, a referral reward, or a
-- purchase made on another device.
--
-- REPLICA IDENTITY FULL so an UPDATE carries the old row as well as the new;
-- without it a payload arrives with only the primary key and the listener
-- cannot tell what changed.

ALTER TABLE public.vip_subscriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vip_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_subscriptions;
  END IF;
END $$;
