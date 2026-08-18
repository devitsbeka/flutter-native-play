-- The app's default language is now English.
--
-- Georgian was the default everywhere: the UI for a fresh install, the
-- missing-translation fallback, and this column. That meant any missed
-- translation surfaced as Georgian text — unreadable to everyone outside
-- Georgia — and every push to a player who had not yet synced a choice went
-- out in Georgian. English is the safe direction to fail in: everyone can
-- at least read it.
--
-- Existing rows are left alone. A 'ka' value cannot be told apart from a
-- deliberate Georgian choice, and every active player's app re-syncs their
-- actual selection to this column on each launch (build 17+), so stale
-- defaults correct themselves.
ALTER TABLE public.profiles
  ALTER COLUMN preferred_language SET DEFAULT 'en';
