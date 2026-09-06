-- The wolf and the dolphin are retired.
--
-- They were the last two mascots still wearing the old artwork; every other
-- animal was re-rendered in the beanbag scene and these two had no new
-- render, so they are dropped rather than left as the odd pair out.
--
-- The order matters. A CHECK is validated against the rows already in the
-- table, so the constraint cannot name a shorter list while anyone still
-- carries one of the two: clear those picks first. NULL is the home
-- screen's own default — it plays the Trivia King loop — so a player who
-- had the wolf lands back where a player who never picked lands, and can
-- choose again from the eight that remain.
--
-- This supersedes 20261006100000_home_mascot_bull_penguin.sql: the list
-- below already carries the bull and the penguin, so on a database where
-- that one has not run, this migration alone brings the constraint current.

UPDATE public.profiles
SET home_mascot = NULL
WHERE home_mascot IN ('wolf', 'dolphin');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_home_mascot_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_mascot_check
  CHECK (
    home_mascot IS NULL
    OR home_mascot IN (
      'king', 'owl', 'panda', 'tiger', 'monkey', 'elephant', 'giraffe',
      'bull', 'penguin'
    )
  );
