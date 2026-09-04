-- Streak milestones, executed rather than reviewed.
--
-- One claim: a milestone pays once, only once the streak has actually
-- reached it, and only to the player whose streak it is. Everything the
-- page shows as "claimed" comes back from streak_milestones_claimed(), so
-- that is asserted too — a page that could not tell it had been paid would
-- offer the button again.
--
-- Same harness as the other suites (see README.md).

\set ON_ERROR_STOP on
\pset pager off

CREATE OR REPLACE FUNCTION pg_temp.must_fail(stmt text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE raised boolean := false;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN raised := true;
  END;
  IF NOT raised THEN
    RAISE EXCEPTION 'ASSERTION FAILED (should have been refused): %', label;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void
LANGUAGE sql AS $$ SELECT set_config('test.uid', COALESCE(u::text, ''), false); $$;

DO $$
DECLARE
  v_player uuid := '00000000-0000-0000-0000-00000000a001';
  v_other  uuid := '00000000-0000-0000-0000-00000000a002';
  v_coins integer;
  v_awarded integer;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (v_player, 'streak-player@test'), (v_other, 'streak-other@test')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (user_id, nickname, coins, gems, current_streak, best_streak) VALUES
    (v_player, 'Streaker', 100, 0, 2, 2), (v_other, 'Other', 100, 0, 30, 30)
  ON CONFLICT (user_id) DO UPDATE SET coins = 100, current_streak = EXCLUDED.current_streak;

  PERFORM pg_temp.as_user(v_player);

  -- Nothing claimed yet, and the page can ask.
  PERFORM pg_temp.must_equal(public.streak_milestones_claimed(), '{}'::integer[], 'a fresh player has claimed nothing');

  -- Two days in: three is not reached.
  PERFORM pg_temp.must_fail('SELECT * FROM public.claim_streak_milestone(3)', 'day 3 cannot be claimed on a streak of 2');
  PERFORM pg_temp.must_fail('SELECT * FROM public.claim_streak_milestone(4)', 'a day that is not a milestone cannot be claimed');

  -- Five days in: three and five pay, each once.
  UPDATE public.profiles SET current_streak = 5 WHERE user_id = v_player;
  SELECT coins_awarded INTO v_awarded FROM public.claim_streak_milestone(3);
  PERFORM pg_temp.must_equal(v_awarded, 50, 'day 3 pays 50');
  SELECT coins INTO v_coins FROM public.profiles WHERE user_id = v_player;
  PERFORM pg_temp.must_equal(v_coins, 150, 'the 50 landed in the wallet');
  PERFORM pg_temp.must_fail('SELECT * FROM public.claim_streak_milestone(3)', 'day 3 does not pay twice');
  SELECT coins INTO v_coins FROM public.profiles WHERE user_id = v_player;
  PERFORM pg_temp.must_equal(v_coins, 150, 'the refused second claim moved nothing');

  SELECT coins_awarded INTO v_awarded FROM public.claim_streak_milestone(5);
  PERFORM pg_temp.must_equal(v_awarded, 75, 'day 5 pays 75');
  PERFORM pg_temp.must_equal(public.streak_milestones_claimed(), '{3,5}'::integer[], 'the page is told both were paid');
  PERFORM pg_temp.must_fail('SELECT * FROM public.claim_streak_milestone(7)', 'day 7 is still ahead');

  -- The ledger is per player: the other player's 30-day streak is theirs.
  PERFORM pg_temp.as_user(v_other);
  PERFORM pg_temp.must_equal(public.streak_milestones_claimed(), '{}'::integer[], 'another player sees their own empty ledger');
  SELECT coins_awarded INTO v_awarded FROM public.claim_streak_milestone(30);
  PERFORM pg_temp.must_equal(v_awarded, 300, 'day 30 pays 300');
  PERFORM pg_temp.as_user(v_player);
  PERFORM pg_temp.must_equal(public.streak_milestones_claimed(), '{3,5}'::integer[], 'and it did not leak into the first player''s ledger');

  -- Nobody at all.
  PERFORM pg_temp.as_user(NULL);
  PERFORM pg_temp.must_fail('SELECT * FROM public.claim_streak_milestone(3)', 'a signed-out caller cannot claim');
END $$;
