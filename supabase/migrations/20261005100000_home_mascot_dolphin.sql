-- One more mascot: the dolphin.
--
-- profiles.home_mascot carries a CHECK naming the mascot ids (see
-- 20261004100000_home_mascot.sql). The list mirrors MASCOT_IDS in
-- src/config/mascots.ts, so a new mascot recreates the constraint here
-- rather than editing a migration that may already be applied.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_mascot_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_mascot_check
  CHECK (
    home_mascot IS NULL
    OR home_mascot IN ('king', 'owl', 'panda', 'wolf', 'tiger', 'monkey', 'elephant', 'giraffe', 'dolphin')
  );
