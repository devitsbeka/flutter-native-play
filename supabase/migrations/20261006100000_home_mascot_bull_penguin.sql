-- Two more mascots: the bull and the penguin.
--
-- profiles.home_mascot carries a CHECK naming the mascot ids (see
-- 20261004100000_home_mascot.sql). The list mirrors MASCOT_IDS in
-- src/config/mascots.ts, so a new mascot recreates the constraint here
-- rather than editing a migration that may already be applied.
--
-- Until this runs, picking either of the two is refused on save: the tile
-- is in the picker, the choice does not stick.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_mascot_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_mascot_check
  CHECK (
    home_mascot IS NULL
    OR home_mascot IN (
      'king', 'owl', 'panda', 'wolf', 'tiger', 'monkey', 'elephant', 'giraffe',
      'dolphin', 'bull', 'penguin'
    )
  );
