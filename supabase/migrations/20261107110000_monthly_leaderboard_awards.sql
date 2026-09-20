-- Finishing in the top three of a month's leaderboard pays, and says so.
--
-- The RATING board ranks by `profiles.coins` — a CURRENT BALANCE. Paying the
-- top three out of that column would have been a loop: the prize for being
-- richest is more riches, and the leader's lead is permanent. It also already
-- rewards hoarding, since anyone who spends drops down the board.
--
-- So the award is decided on what a player EARNED in the month, read from the
-- `currency_grants` ledger, and it resets to zero every month. Two properties
-- follow that the balance board does not have: last month's win is worth
-- nothing this month, and spending your coins costs you nothing.
--
-- Three things are deliberately not counted as earnings:
--
--   * Coins BOUGHT. `shop_grant` and `exchange` credit real coins for gems,
--     so counting them would sell first place for 24 gems.
--   * The award itself. `month_award` coins landing in the ledger would count
--     towards the next month, and a winner would partly win because they won.
--   * Anything not on the allowlist below. A `kind` counts only when somebody
--     adds it here, so a new grant kind invented later cannot quietly become
--     a way up the board.
--
-- Stakes count, negative. `room_stake` and a lost quick game are part of what
-- playing earned you, and netting them is what stops a farm of deliberately
-- lost games from ranking.
--
-- There is no scheduler on this database (see 20261013100000), so nothing
-- fires on the first of the month. `settle_leaderboard_month()` is idempotent
-- and settles whatever months have finished since it last ran; the client
-- calls it when the leaderboard opens, and the first person through the door
-- after a month ends settles it for everybody.

-- ── 1. What counts as earning ──────────────────────────────────────────────
--
-- A table rather than a list inside the function, so it can be read from the
-- admin screens and changed without a function body.

CREATE TABLE IF NOT EXISTS public.leaderboard_earning_kinds (
  kind text PRIMARY KEY,
  note text
);

ALTER TABLE public.leaderboard_earning_kinds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Earning kinds are readable" ON public.leaderboard_earning_kinds;
CREATE POLICY "Earning kinds are readable"
  ON public.leaderboard_earning_kinds FOR SELECT
  USING (true);

INSERT INTO public.leaderboard_earning_kinds (kind, note) VALUES
  ('quiz_reward',      'answering questions'),
  ('stake_win',        'winning a staked game'),
  ('stake_loss',       'losing one — negative, and part of the same ledger'),
  ('room_stake',       'paying into a room pot — negative'),
  ('room_prize',       'taking a room pot'),
  ('king_win',         'winning king of the hill'),
  ('king_question',    'a question answered in king of the hill'),
  ('level_up',         'levelling up'),
  ('mission',          'finishing a mission'),
  ('spin',             'the wheel'),
  ('chest',            'a chest'),
  ('ad_reward',        'watching an ad'),
  ('feed_trivia',      'playing a trivia from the feed'),
  ('streak_milestone', 'a daily streak milestone'),
  ('daily_reward',     'the daily reward ladder')
ON CONFLICT (kind) DO NOTHING;

-- ── 2. The awards ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leaderboard_month_awards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The first day of the month that was won, so a period is a date and sorts.
  period       date NOT NULL,
  scope        text NOT NULL CHECK (scope IN ('global', 'country')),
  -- Null for global. Kept null rather than '' so the column means what it
  -- says; the unique index below coalesces it.
  country_code text,
  rank         integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  user_id      uuid NOT NULL,
  coins        integer NOT NULL,
  gems         integer NOT NULL,
  -- What won it. Kept so the card can say "you earned 41,200 this month"
  -- without recomputing a month that has since had more grants written.
  earned_coins bigint NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- The payout happens at settle time, in the same transaction. This is only
  -- "has the player been shown their trophy yet", so a missed modal can never
  -- cost anybody a prize.
  seen_at      timestamptz
);

-- One winner per slot. A plain UNIQUE would not do it: Postgres treats NULLs
-- as distinct, so ('2026-08-01','global',NULL,1) could be inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_month_awards_slot_idx
  ON public.leaderboard_month_awards (period, scope, COALESCE(country_code, ''), rank);

-- And one award per player per month: the global winners are settled first
-- and are then out of the running on their own country's board, so nobody is
-- paid twice for the same month of play.
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_month_awards_one_per_user_idx
  ON public.leaderboard_month_awards (period, user_id);

CREATE INDEX IF NOT EXISTS leaderboard_month_awards_user_idx
  ON public.leaderboard_month_awards (user_id, period DESC);

ALTER TABLE public.leaderboard_month_awards ENABLE ROW LEVEL SECURITY;

-- Everyone can read every award: this is the wall of fame, and the public
-- profile draws somebody else's trophies from it.
DROP POLICY IF EXISTS "Awards are public" ON public.leaderboard_month_awards;
CREATE POLICY "Awards are public"
  ON public.leaderboard_month_awards FOR SELECT
  USING (true);

-- No client write policy at all. Awards are written by settle_leaderboard_month
-- and marked seen by mark_month_award_seen, both SECURITY DEFINER.

-- ── 3. What each place is worth ────────────────────────────────────────────
--
-- Mirrored in src/config/leaderboardMonthly.ts, which is what the screens
-- read. The database is the one that pays, so these are the real numbers;
-- monthlyLeaderboardAwards.test.ts holds the two in step.

CREATE TABLE IF NOT EXISTS public.leaderboard_month_prizes (
  scope text NOT NULL CHECK (scope IN ('global', 'country')),
  rank  integer NOT NULL CHECK (rank BETWEEN 1 AND 3),
  coins integer NOT NULL CHECK (coins >= 0),
  gems  integer NOT NULL CHECK (gems >= 0),
  PRIMARY KEY (scope, rank)
);

ALTER TABLE public.leaderboard_month_prizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prizes are readable" ON public.leaderboard_month_prizes;
CREATE POLICY "Prizes are readable"
  ON public.leaderboard_month_prizes FOR SELECT
  USING (true);

INSERT INTO public.leaderboard_month_prizes (scope, rank, coins, gems) VALUES
  ('global',  1, 15000, 3),
  ('global',  2,  5000, 2),
  ('global',  3,  1500, 1),
  ('country', 1,  5000, 3),
  ('country', 2,  1500, 2),
  ('country', 3,   500, 1)
ON CONFLICT (scope, rank) DO UPDATE
  SET coins = EXCLUDED.coins,
      gems  = EXCLUDED.gems;

-- ── 4. What a player earned in a month ─────────────────────────────────────
--
-- Deleted accounts and admins are out, matching the board itself
-- (src/pages/Leaderboards.tsx): an admin topping the list would be both
-- unfair and a bad look.

CREATE OR REPLACE FUNCTION public.leaderboard_month_earnings(p_period date)
RETURNS TABLE (user_id uuid, earned bigint, country_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.user_id,
         SUM(g.coins)::bigint AS earned,
         p.country_code
    FROM public.currency_grants g
    JOIN public.leaderboard_earning_kinds k ON k.kind = g.kind
    JOIN public.profiles p ON p.user_id = g.user_id
   WHERE g.created_at >= p_period
     AND g.created_at <  (p_period + interval '1 month')
     AND p.nickname IS DISTINCT FROM '[წაშლილი]'
     AND NOT EXISTS (
           SELECT 1 FROM public.user_roles r
            WHERE r.user_id = g.user_id AND r.role = 'admin'
         )
   GROUP BY g.user_id, p.country_code
  HAVING SUM(g.coins) > 0;
$$;

REVOKE ALL ON FUNCTION public.leaderboard_month_earnings(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_month_earnings(date) TO authenticated;

-- ── 5. Settling a finished month ───────────────────────────────────────────
--
-- Which months have been done is its own table rather than something read
-- back out of the awards. A month in which nobody earned anything produces
-- no awards, and "no awards" is indistinguishable from "never settled" — so
-- every future call would rescan it for ever.

CREATE TABLE IF NOT EXISTS public.leaderboard_month_settled (
  period     date PRIMARY KEY,
  awarded    integer NOT NULL DEFAULT 0,
  settled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_month_settled ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settled months are readable" ON public.leaderboard_month_settled;
CREATE POLICY "Settled months are readable"
  ON public.leaderboard_month_settled FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.settle_leaderboard_month()
RETURNS TABLE (settled integer, awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period  date;
  v_this    date := date_trunc('month', now())::date;
  v_count   integer := 0;
  v_awarded integer := 0;
  v_row     record;
BEGIN
  settled := 0;
  awarded := 0;

  -- One settler at a time. Without it, two people opening the leaderboard in
  -- the same second both find the month unsettled and both start paying. The
  -- unique indexes would reject the duplicate award rows, but only after one
  -- of the two had already credited somebody.
  IF NOT pg_try_advisory_xact_lock(hashtext('settle_leaderboard_month')) THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Start at the month after the last one settled; first time through, at the
  -- month of the earliest grant anybody has. Nothing earned ever means
  -- nothing to settle.
  SELECT COALESCE(
           (SELECT (MAX(period) + interval '1 month')::date
              FROM public.leaderboard_month_settled),
           (SELECT date_trunc('month', MIN(created_at))::date
              FROM public.currency_grants)
         )
    INTO v_period;

  IF v_period IS NULL THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- A loop rather than a single month, so an app nobody opened for a while
  -- settles every month it slept through instead of only the most recent.
  WHILE v_period < v_this LOOP
    v_count := 0;

    -- Global first, so its winners are out of the running on their own
    -- country's board. A country slot vacated that way falls to the next
    -- player who has not already won rather than going unawarded.
    FOR v_row IN
      SELECT e.user_id,
             e.earned,
             ROW_NUMBER() OVER (ORDER BY e.earned DESC, e.user_id) AS rank
        FROM public.leaderboard_month_earnings(v_period) e
       ORDER BY e.earned DESC, e.user_id
       LIMIT 3
    LOOP
      PERFORM public.pay_month_award(
        v_period, 'global', NULL, v_row.rank::integer, v_row.user_id, v_row.earned);
      v_count := v_count + 1;
    END LOOP;

    FOR v_row IN
      SELECT ranked.user_id, ranked.earned, ranked.country_code, ranked.rank
        FROM (
          SELECT e.user_id, e.earned, e.country_code,
                 ROW_NUMBER() OVER (PARTITION BY e.country_code
                                        ORDER BY e.earned DESC, e.user_id) AS rank
            FROM public.leaderboard_month_earnings(v_period) e
           WHERE e.country_code IS NOT NULL
             AND NOT EXISTS (
                   SELECT 1 FROM public.leaderboard_month_awards w
                    WHERE w.period = v_period AND w.user_id = e.user_id
                 )
        ) ranked
       WHERE ranked.rank <= 3
    LOOP
      PERFORM public.pay_month_award(
        v_period, 'country', v_row.country_code, v_row.rank::integer,
        v_row.user_id, v_row.earned);
      v_count := v_count + 1;
    END LOOP;

    INSERT INTO public.leaderboard_month_settled (period, awarded)
    VALUES (v_period, v_count)
    ON CONFLICT (period) DO NOTHING;

    v_awarded := v_awarded + v_count;
    settled   := settled + 1;
    v_period  := (v_period + interval '1 month')::date;
  END LOOP;

  awarded := v_awarded;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_leaderboard_month() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_leaderboard_month() TO authenticated;

-- ── 6. Writing one award, and paying it ────────────────────────────────────
--
-- Internal: the settle function is the only caller. Split out so the two
-- ranking queries above do not each carry a copy of the payout, which is
-- exactly the shape that lets a grant happen without its award row.

CREATE OR REPLACE FUNCTION public.pay_month_award(
  p_period  date,
  p_scope   text,
  p_country text,
  p_rank    integer,
  p_user    uuid,
  p_earned  bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coins integer;
  v_gems  integer;
BEGIN
  SELECT coins, gems INTO v_coins, v_gems
    FROM public.leaderboard_month_prizes
   WHERE scope = p_scope AND rank = p_rank;

  IF v_coins IS NULL THEN
    RETURN;  -- no prize defined for this slot
  END IF;

  INSERT INTO public.leaderboard_month_awards
    (period, scope, country_code, rank, user_id, coins, gems, earned_coins)
  VALUES (p_period, p_scope, p_country, p_rank, p_user, v_coins, v_gems, p_earned)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    RETURN;  -- somebody else settled this slot first
  END IF;

  -- Paid here, in the same transaction as the award row. There is no claim
  -- step: a prize that has to be collected is a prize somebody loses by not
  -- opening the app, and the row above is the receipt either way.
  --
  -- Through apply_currency_grant rather than by hand, because that is the
  -- one primitive that moves a balance and writes its ledger row together.
  PERFORM public.apply_currency_grant(
    p_user, 'month_award', v_coins, v_gems,
    p_scope || ' #' || p_rank || ' ' || to_char(p_period, 'YYYY-MM'));
END;
$$;

-- Not callable by anyone. It pays out, and it trusts its arguments entirely —
-- the ranking above IS the authorisation. settle_leaderboard_month is
-- SECURITY DEFINER and so reaches it regardless of these grants.
REVOKE ALL ON FUNCTION public.pay_month_award(date, text, text, integer, uuid, bigint)
  FROM PUBLIC, anon, authenticated;

-- ── 7. Marking a trophy as seen ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_month_award_seen(p_award_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leaderboard_month_awards
     SET seen_at = now()
   WHERE id = p_award_id
     AND user_id = auth.uid()
     AND seen_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_month_award_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_month_award_seen(uuid) TO authenticated;

-- ── 8. The 'month_award' grant kind ────────────────────────────────────────
--
-- Deliberately NOT added to leaderboard_earning_kinds: see the header. It is
-- in currency_grant_limits so the ledger's own accounting knows about it;
-- nothing calls credit_gameplay_reward with it, since pay_month_award writes
-- the row itself.

INSERT INTO public.currency_grant_limits
  (kind, max_coins_call, max_gems_call, max_coins_day, max_gems_day)
VALUES ('month_award', 15000, 3, 15000, 3)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;
