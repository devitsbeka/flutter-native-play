-- The mascot that backs the home screen.
--
-- The home screen used to paint a scene generated from the player's own
-- photo, chosen from "my scenes" in the avatar studio. That picker is gone:
-- the player now picks one of eight mascots, and the mascot's scene is the
-- home screen. The circle avatar (selfie, upload, generated portrait) is a
-- separate choice and is untouched by this.
--
-- One column on the profile, owner-written through the existing own-row
-- UPDATE policy. The client keeps a localStorage copy and falls back to it
-- while this column is missing, so the app does not depend on the order in
-- which the build and this migration land.
--
-- The CHECK mirrors `MASCOT_IDS` in src/config/mascots.ts: a new mascot is
-- added in both places.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_mascot text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_mascot_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_mascot_check
  CHECK (
    home_mascot IS NULL
    OR home_mascot IN ('king', 'owl', 'panda', 'wolf', 'tiger', 'monkey', 'elephant', 'giraffe')
  );

-- SELECT on profiles is granted per column (see lock_wallet_columns), so a
-- new column is unreadable until it is named here. Only the owner ever reads
-- it, through their own session; anon has no use for it.
GRANT SELECT (home_mascot) ON public.profiles TO authenticated;
GRANT UPDATE (home_mascot) ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.home_mascot IS
  'Which mascot scene backs the home screen; NULL means the default (the Trivia King loop). Ids in src/config/mascots.ts.';
