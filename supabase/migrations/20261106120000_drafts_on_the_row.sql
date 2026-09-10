-- Drafts live on the row, and a level-up is paid once.
--
-- Two small things the online-room audit turned up, both of them "the
-- database did not know".
--
-- 1. "+ Room" opens the lobby on a row that already exists (a lobby needs a
--    row to subscribe to, invite into and rename) but the host has not said
--    they want it — Create or Start does that, and backing out alone before
--    then deletes it. Which rows were drafts, and which tab each came from,
--    was remembered in localStorage: per device. On the host's second
--    device the same room was not a draft and had no publish intent, so
--    Create there published nothing and landed on the wrong tab, while the
--    first device still believed the room could be backed out of and
--    deleted. The two facts go on game_rooms now. Both host-writable
--    through the existing host UPDATE policy; a draft is born private, so
--    no list or RPC needs to learn the column to keep it off the Public
--    tab — the client reads it (roomCreateOffered.roomIsDraft) and falls
--    back to the device for rows from before this file.
--
-- 2. The level-up credit was retried by the client when the first call
--    "failed" — and a lost response is a failure — with no unique index over
--    kind = 'level_up' to stop the second call paying again. Every other
--    ledger kind that is paid once per cause has one (stake, room, team,
--    king, streak, pro_welcome); level_up gets the same, on the reference
--    the client already sends ("level N" per category). The retry then
--    lands on the index and pays nothing, which is what a retry is for.

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.game_rooms.is_draft IS
  'Made by "+ Room"; the host has not pressed Create or Start yet. Backing out alone deletes it.';
COMMENT ON COLUMN public.game_rooms.draft_public IS
  'What Create publishes the draft as: true when it came from the Public tab.';

CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_level_up_reference_unique
  ON public.currency_grants (user_id, kind, reference)
  WHERE kind = 'level_up' AND reference IS NOT NULL;
