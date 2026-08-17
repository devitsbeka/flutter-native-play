-- FriendsContext has subscribed to postgres_changes on friendships since the
-- feature shipped — but friendships was never added to the supabase_realtime
-- publication, so not one event was ever delivered. The visible symptom: a
-- newly accepted friend does not appear in the home friends row until the
-- app is killed and relaunched, because the refetch that subscription was
-- supposed to trigger never fired.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already published; nothing to do
  WHEN undefined_object THEN
    -- Plain-Postgres test harnesses have no Supabase-managed publication;
    -- create one so the migration applies the same everywhere.
    CREATE PUBLICATION supabase_realtime FOR TABLE public.friendships;
END $$;

-- Realtime delivers an UPDATE/DELETE payload's old row only when the table
-- has full replica identity; without it the accepted-request toast cannot
-- tell a fresh acceptance from any other update. Standard for realtime
-- tables in this schema.
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
