-- The shop stops trusting the client with money.
--
-- 20260813120000 said this was deliberately out of scope:
--
--   "Deliberately NOT in scope: this does not debit gems. The shop debits
--    before calling, through update_user_currency, exactly as it does today.
--    ... that is a separate track, and folding it in here would change the
--    shop's purchase semantics in the middle of a security fix."
--
-- This is that separate track. Three holes, all the same shape — a grant that
-- does not check that anything was paid:
--
--   1. grant_vip_days(p_duration) took a duration and nothing else. Granted to
--      `authenticated`, and it STACKS by design, so:
--
--        await supabase.rpc('grant_vip_days', { p_duration: 'month' })
--
--      in the browser console, repeated, is unlimited free PRO. The tier it
--      writes is 'standard', which is not a limitation: VipContext's isVip is
--      `expires_at > now` and nothing else, so 'standard' gets 2x XP, no ads,
--      four spins and no game stake.
--
--   2. credit_gameplay_reward('shop_grant', ...) is how a purchase DELIVERED
--      what was bought, so its ceiling had to be big: 200 000 coins and 500
--      gems a call, a million coins and 2 000 gems a day. It is granted to
--      `authenticated` like every other kind and carries no evidence a debit
--      happened, so the ceiling was the exploit. 2 000 gems a day is eight
--      months of PRO, for nothing.
--
--   3. adjust_power_up(p_type, p_delta) accepted any positive delta, and
--      user_power_ups carried "users can insert/update their own" policies on
--      top of that, so power-ups could be written straight from the console.
--      user_avatar_frames had the same INSERT policy: every frame, free.
--
-- The fix is one function that does both halves in one transaction, and a
-- catalogue the server owns. The client names an item; the server decides what
-- it costs and what it grants. That is the same rule _shared/gems.ts and
-- _shared/iap.ts already apply to real-money purchases, and this is the third
-- and last place that was still doing it the other way round.
--
-- Also here, because it is the same lesson about the economy leaking: a spread
-- on the coins->gems exchange. See section 7.

-- ── 1. The catalogue ───────────────────────────────────────────────────────
--
-- Mirrors the client catalogues (src/config/shopValue.ts, shopDeals.ts,
-- rewardConfig.ts VIP_PRICES, useAvatarFrames.ts). Nothing is derived at
-- runtime and nothing is read from the request except the id.
--
-- src/__tests__/shopCatalog.test.ts reads this file and fails if any price or
-- grant here disagrees with the client's. That test is the only thing keeping
-- a shop price change from charging one number and showing another.

CREATE TABLE IF NOT EXISTS public.shop_catalog (
  id            text PRIMARY KEY,
  -- What the player pays, in gems. Always positive: nothing here is free, and
  -- a zero would make purchase_shop_item a grant with no debit, which is the
  -- bug this table exists to end.
  price_gems    integer NOT NULL CHECK (price_gems > 0),
  coins         integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  -- Gems back from a gem purchase. Zero everywhere today and constrained to
  -- stay below the price, so an item can never mint more than it costs.
  gems          integer NOT NULL DEFAULT 0 CHECK (gems >= 0),
  -- N of EVERY power type, which is what a bundle's `powers` has always meant.
  powers        integer NOT NULL DEFAULT 0 CHECK (powers >= 0),
  -- The single-type packs instead: this many of this one type.
  power_type    text,
  power_amount  integer NOT NULL DEFAULT 0 CHECK (power_amount >= 0),
  vip_duration  text,
  frame_id      text,
  is_active     boolean NOT NULL DEFAULT true,
  CONSTRAINT shop_catalog_never_mints_gems CHECK (gems < price_gems),
  CONSTRAINT shop_catalog_power_type_pairs CHECK (
    (power_type IS NULL AND power_amount = 0) OR
    (power_type IS NOT NULL AND power_amount > 0)
  ),
  CONSTRAINT shop_catalog_known_vip_duration CHECK (
    vip_duration IS NULL OR vip_duration IN ('day', '2days', 'week', '10days', 'month')
  ),
  CONSTRAINT shop_catalog_known_power_type CHECK (
    power_type IS NULL OR power_type IN ('5050', 'freeze', 'replace', 'time-drain')
  ),
  CONSTRAINT shop_catalog_grants_something CHECK (
    coins > 0 OR gems > 0 OR powers > 0 OR power_amount > 0
    OR vip_duration IS NOT NULL OR frame_id IS NOT NULL
  )
);

ALTER TABLE public.shop_catalog ENABLE ROW LEVEL SECURITY;

-- Readable by anyone signed in — the client already knows these prices, they
-- are compiled into the bundle. Never client-writable; purchase_shop_item is
-- SECURITY DEFINER and reads it as the owner.
DROP POLICY IF EXISTS "Anyone can read the shop catalogue" ON public.shop_catalog;
CREATE POLICY "Anyone can read the shop catalogue"
  ON public.shop_catalog FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.shop_catalog
  (id, price_gems, coins, powers, power_type, power_amount, vip_duration, frame_id) VALUES
  -- Coin packs. coins_10000 is the home modal's own rung; the others are the
  -- shop grid's. Both surfaces buy through this table now.
  ('coins_500', 1, 500, 0, NULL, 0, NULL, NULL),
  ('coins_1500', 3, 1500, 0, NULL, 0, NULL, NULL),
  ('coins_5000', 9, 5000, 0, NULL, 0, NULL, NULL),
  ('coins_15000', 24, 15000, 0, NULL, 0, NULL, NULL),
  ('coins_10000', 20, 10000, 0, NULL, 0, NULL, NULL),
  -- Single-type power packs. Both catalogues' spellings, because the shop grid
  -- says power_5050_3 and the home modal says power_5050 for the same item.
  ('power_5050_3', 3, 0, 0, '5050', 3, NULL, NULL),
  ('power_5050', 3, 0, 0, '5050', 3, NULL, NULL),
  ('power_freeze_3', 3, 0, 0, 'freeze', 3, NULL, NULL),
  ('power_freeze', 3, 0, 0, 'freeze', 3, NULL, NULL),
  ('power_replace_3', 3, 0, 0, 'replace', 3, NULL, NULL),
  ('power_replace', 3, 0, 0, 'replace', 3, NULL, NULL),
  ('power_timedrain_3', 3, 0, 0, 'time-drain', 3, NULL, NULL),
  ('power_timedrain', 3, 0, 0, 'time-drain', 3, NULL, NULL),
  -- Power bundles: N of EVERY type.
  ('power_bundle_small', 7, 0, 2, NULL, 0, NULL, NULL),
  ('power_bundle_large', 28, 0, 10, NULL, 0, NULL, NULL),
  ('power_bundle', 16, 0, 5, NULL, 0, NULL, NULL),
  ('mega_power_bundle', 16, 0, 5, NULL, 0, NULL, NULL),
  ('power_combo_bundle', 10, 0, 3, NULL, 0, NULL, NULL),
  -- Starter packs, at the derived prices in src/config/shopValue.ts.
  ('starter_bundle', 6, 500, 2, NULL, 0, NULL, NULL),
  ('starter_bundle_medium', 16, 1000, 5, NULL, 0, NULL, NULL),
  ('starter_bundle_large', 25, 2500, 10, NULL, 0, NULL, NULL),
  -- VIP time. Priced against the subscription — see 20261104100000.
  ('vip_day', 70, 0, 0, NULL, 0, 'day', NULL),
  ('vip_week', 230, 0, 0, NULL, 0, 'week', NULL),
  ('vip_week_deal', 230, 0, 0, NULL, 0, 'week', NULL),
  ('vip_month', 570, 0, 0, NULL, 0, 'month', NULL),
  -- Rotating deals. Every deal is listed, not only today's: the rotation
  -- decides what is SHOWN, and a player who names another id gets the same
  -- 40% discount, which is why they all carry it.
  ('deal_daily_royal', 152, 2500, 5, NULL, 0, 'week', NULL),
  ('deal_daily_champion', 160, 5000, 10, NULL, 0, 'week', NULL),
  ('deal_hourly_duo', 80, 500, 1, NULL, 0, '2days', NULL),
  ('deal_hourly_flash', 47, 1000, 2, NULL, 0, 'day', NULL),
  ('deal_hourly_blitz', 50, 500, 3, NULL, 0, 'day', NULL),
  ('deal_hourly_rush', 49, 2000, 1, NULL, 0, 'day', NULL),
  ('deal_hourly_arsenal', 54, 500, 5, NULL, 0, 'day', NULL),
  ('deal_hourly_vault', 50, 3000, 1, NULL, 0, 'day', NULL),
  ('deal_daily_booster', 51, 1500, 3, NULL, 0, 'day', NULL),
  -- Avatar frames. The three vip-* frames are earned and never sold, so they
  -- are absent rather than priced at zero — price_gems > 0 is the constraint
  -- that keeps a free grant out of this table.
  ('frame_galaxy', 15, 0, 0, NULL, 0, NULL, 'galaxy'),
  ('frame_fire', 25, 0, 0, NULL, 0, NULL, 'fire'),
  ('frame_ice', 15, 0, 0, NULL, 0, NULL, 'ice'),
  ('frame_golden', 50, 0, 0, NULL, 0, NULL, 'golden'),
  ('frame_neon', 25, 0, 0, NULL, 0, NULL, 'neon'),
  ('frame_rainbow', 40, 0, 0, NULL, 0, NULL, 'rainbow')
ON CONFLICT (id) DO UPDATE
  SET price_gems   = EXCLUDED.price_gems,
      coins        = EXCLUDED.coins,
      gems         = EXCLUDED.gems,
      powers       = EXCLUDED.powers,
      power_type   = EXCLUDED.power_type,
      power_amount = EXCLUDED.power_amount,
      vip_duration = EXCLUDED.vip_duration,
      frame_id     = EXCLUDED.frame_id,
      is_active    = true;

-- ── 2. Power-up quantities become server-only ──────────────────────────────
--
-- The table carried "users can insert/update their own power-ups", so the
-- quantity was a client-writable integer. Reading stays; writing goes through
-- the two functions below.

DROP POLICY IF EXISTS "Users can update own power-ups" ON public.user_power_ups;
DROP POLICY IF EXISTS "Users can insert own power-ups" ON public.user_power_ups;

-- New accounts still need their starting power-ups, and useUserPowerUps used
-- to INSERT them directly. Same numbers (DEFAULT_POWER_UPS), decided here.
CREATE OR REPLACE FUNCTION public.ensure_default_power_ups()
-- The OUT parameters are deliberately NOT named after the columns. A
-- RETURNS TABLE column is a PL/pgSQL variable in scope for the whole body,
-- so `power_up_type` here makes `ON CONFLICT (user_id, power_up_type)` below
-- ambiguous and the function fails at runtime with 42702 — which a
-- CREATE FUNCTION does not catch, and neither does anything short of calling
-- it. It shipped that way for exactly as long as it took to run
-- supabase/tests/18-shop-purchase.sql.
RETURNS TABLE (power_type text, owned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
  VALUES (v_user_id, '5050', 2),
         (v_user_id, 'freeze', 1),
         (v_user_id, 'replace', 1),
         (v_user_id, 'time-drain', 1)
  ON CONFLICT (user_id, power_up_type) DO NOTHING;

  RETURN QUERY
    SELECT p.power_up_type, p.quantity
      FROM public.user_power_ups p
     WHERE p.user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_power_ups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_power_ups() TO authenticated;

-- adjust_power_up becomes debit-only, exactly as update_user_currency did and
-- for the same reason: a client naming its own positive delta is a client
-- printing its own goods. Spending one in a game is still the client's to do;
-- gaining one is not.
CREATE OR REPLACE FUNCTION public.adjust_power_up(p_type text, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The service role (auth.uid() is null) never reaches here, so this is a
  -- rule about signed-in callers only — same shape as update_user_currency.
  IF p_delta > 0 THEN
    RAISE EXCEPTION
      'Power-ups cannot be granted from a client. Buy through purchase_shop_item, or award through grant_power_ups.';
  END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
  VALUES (v_user_id, p_type, 0)
  ON CONFLICT (user_id, power_up_type)
  DO UPDATE SET quantity = GREATEST(0, user_power_ups.quantity + p_delta)
  RETURNING quantity INTO v_quantity;

  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_power_up(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_power_up(text, integer) TO authenticated;

-- The internal grant primitive. Not granted to anyone: purchase_shop_item and
-- the level-up path call it, and both decide the amount themselves.
CREATE OR REPLACE FUNCTION public.grant_power_ups(
  p_user_id uuid,
  p_type text,
  p_amount integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'A power-up grant must be positive';
  END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
  VALUES (p_user_id, p_type, p_amount)
  ON CONFLICT (user_id, power_up_type)
  DO UPDATE SET quantity = user_power_ups.quantity + p_amount
  RETURNING quantity INTO v_quantity;

  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_power_ups(uuid, text, integer) FROM PUBLIC;

-- Power-ups bought with COINS, which is a different shop from the gem one.
--
-- PowerUpShopModal and the single-power row on /power-ups both did
-- `spendCoins(price)` then `addPowerUp(...)`, with the price read out of
-- REWARDS.POWER_UP_PRICES in the bundle. Same two-call shape as the gem shop,
-- same hole: the second call worked on its own. The prices are the
-- `powerup_price_*` rows in economy_config, which is where the admin economy
-- screen already reads them.
CREATE OR REPLACE FUNCTION public.purchase_power_up(
  p_type text,
  p_quantity integer DEFAULT 1
)
RETURNS TABLE (new_coins integer, owned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_unit    integer;
  v_total   integer;
  v_coins   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_quantity <= 0 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'Quantity out of range';
  END IF;

  IF p_type NOT IN ('5050', 'freeze', 'replace', 'time-drain') THEN
    RAISE EXCEPTION 'Unknown power-up: %', p_type;
  END IF;

  SELECT value INTO v_unit FROM public.economy_config
   WHERE id = 'powerup_price_' || replace(p_type, '-', '_');

  -- A missing price is a refusal, not a free power-up. `time-drain` is stored
  -- as powerup_price_time_drain, hence the replace() above — and getting that
  -- mapping wrong is exactly the kind of thing that would otherwise sell a
  -- power-up for nothing, which is why it raises rather than defaulting.
  IF v_unit IS NULL OR v_unit <= 0 THEN
    RAISE EXCEPTION 'No price configured for %', p_type;
  END IF;

  v_total := v_unit * p_quantity;

  SELECT coins INTO v_coins FROM public.profiles
   WHERE user_id = v_user_id FOR UPDATE;

  IF v_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_coins < v_total THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  UPDATE public.profiles
     SET coins = coins - v_total, updated_at = now()
   WHERE user_id = v_user_id
  RETURNING coins INTO new_coins;

  owned := public.grant_power_ups(v_user_id, p_type, p_quantity);

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'power_up_purchase', -v_total, 0, p_type);

  INSERT INTO public.purchase_transactions
    (user_id, product_id, product_type, currency_used, amount_paid, value_received, platform)
  VALUES (v_user_id, p_type, 'powerup', 'coins', v_total,
          jsonb_build_object(p_type, p_quantity), 'web');

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_power_up(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_power_up(text, integer) TO authenticated;

-- Power-ups awarded rather than bought: a spin segment, a rewarded ad, a
-- level-up. These are the same trade credit_gameplay_reward makes for coins —
-- the client says what happened, the server bounds how much it can be worth —
-- and they need the same ceilings, for the same reason: without one, "I won a
-- power-up" is an unlimited supply.
CREATE TABLE IF NOT EXISTS public.power_up_grant_limits (
  kind          text PRIMARY KEY,
  max_per_call  integer NOT NULL,
  max_per_day   integer NOT NULL
);

ALTER TABLE public.power_up_grant_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read power-up grant limits" ON public.power_up_grant_limits;
CREATE POLICY "Anyone can read power-up grant limits"
  ON public.power_up_grant_limits FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.power_up_grant_limits (kind, max_per_call, max_per_day) VALUES
  -- Four spins a day is the VIP allowance; one segment in eight is a power-up.
  ('spin',       1, 4),
  -- MAX_ADS_PER_DAY in rewardConfig.
  ('ad_reward',  1, 5),
  ('level_up',   1, 10),
  ('chest',      1, 2),
  ('mission',    2, 6)
ON CONFLICT (kind) DO UPDATE
  SET max_per_call = EXCLUDED.max_per_call,
      max_per_day  = EXCLUDED.max_per_day;

CREATE TABLE IF NOT EXISTS public.power_up_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  kind        text NOT NULL,
  power_type  text NOT NULL,
  amount      integer NOT NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.power_up_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own power-up grants" ON public.power_up_grants;
CREATE POLICY "Users can view their own power-up grants"
  ON public.power_up_grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS power_up_grants_user_day_idx
  ON public.power_up_grants (user_id, kind, created_at DESC);

CREATE OR REPLACE FUNCTION public.grant_reward_power_up(
  p_kind text,
  p_type text,
  p_amount integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit   public.power_up_grant_limits%ROWTYPE;
  v_today   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'A reward cannot be negative';
  END IF;

  IF p_type NOT IN ('5050', 'freeze', 'replace', 'time-drain') THEN
    RAISE EXCEPTION 'Unknown power-up: %', p_type;
  END IF;

  SELECT * INTO v_limit FROM public.power_up_grant_limits WHERE kind = p_kind;

  IF v_limit.kind IS NULL THEN
    RAISE EXCEPTION 'Unknown reward kind: %', p_kind;
  END IF;

  IF p_amount > v_limit.max_per_call THEN
    RAISE EXCEPTION 'Reward of % exceeds the per-award limit for %', p_amount, p_kind;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_today
    FROM public.power_up_grants
   WHERE user_id = v_user_id AND kind = p_kind
     AND created_at >= date_trunc('day', now());

  IF v_today + p_amount > v_limit.max_per_day THEN
    RAISE EXCEPTION 'Daily % limit reached', p_kind;
  END IF;

  INSERT INTO public.power_up_grants (user_id, kind, power_type, amount)
  VALUES (v_user_id, p_kind, p_type, p_amount);

  RETURN public.grant_power_ups(v_user_id, p_type, p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reward_power_up(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_reward_power_up(text, text, integer) TO authenticated;

-- ── 3. Frames become server-only too ───────────────────────────────────────
--
-- Same hole, quieter: the client INSERTed the unlock row itself, so every
-- frame in the shop was free to anyone who called the table directly.
-- Leaderboard frames are written by the reward function under the service
-- role, which RLS does not apply to.

DROP POLICY IF EXISTS "Users can insert their own frames" ON public.user_avatar_frames;

-- The three vip-* frames are free, and the check that they are earned has to
-- happen here rather than in AvatarFrameShop. It did not: the component asked
-- its own `isVip` and then INSERTed the row, so the frames were free to
-- everyone once the INSERT policy above is gone — and were free to everyone
-- BEFORE it was gone, VIP or not, by calling the table directly.
CREATE OR REPLACE FUNCTION public.claim_vip_frame(p_frame_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_vip  boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Named explicitly rather than "any frame with no price". A frame absent
  -- from shop_catalog is not thereby free; these three are the free ones.
  IF p_frame_id NOT IN ('vip-crown', 'vip-diamond', 'vip-royal') THEN
    RAISE EXCEPTION 'Not a subscriber frame: %', p_frame_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vip_subscriptions
     WHERE user_id = v_user_id AND expires_at > now()
  ) INTO v_is_vip;

  IF NOT v_is_vip THEN
    RAISE EXCEPTION 'Subscriber frames need an active subscription';
  END IF;

  INSERT INTO public.user_avatar_frames (user_id, frame_id)
  VALUES (v_user_id, p_frame_id)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_vip_frame(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vip_frame(text) TO authenticated;

-- ── 4. One purchase, one transaction ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id text)
RETURNS TABLE (new_coins integer, new_gems integer, granted jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item    public.shop_catalog%ROWTYPE;
  v_coins   integer;
  v_gems    integer;
  v_type    text;
  v_granted jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_item FROM public.shop_catalog
   WHERE id = p_item_id AND is_active;

  -- An unknown id is refused rather than falling through to some default.
  -- The web gem checkout learned this one the hard way: its fallback built a
  -- generic line item from the request, which made any made-up id work.
  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Unknown shop item: %', p_item_id;
  END IF;

  -- The row lock is the whole concurrency story: two purchases racing on one
  -- balance serialise here, so a player with 10 gems cannot spend them twice.
  SELECT coins, gems INTO v_coins, v_gems
    FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_gems < v_item.price_gems THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  -- Debit and credit in ONE statement. The old flow was two client calls with
  -- the network in between — spendGems(), then a separate grant — so the
  -- second could simply not be made, and the first could be skipped entirely.
  UPDATE public.profiles
     SET coins = coins + v_item.coins,
         gems  = gems - v_item.price_gems + v_item.gems,
         updated_at = now()
   WHERE user_id = v_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'shop_purchase', v_item.coins, v_item.gems - v_item.price_gems, p_item_id);

  v_granted := jsonb_build_object();

  IF v_item.coins > 0 THEN
    v_granted := v_granted || jsonb_build_object('coins', v_item.coins);
  END IF;
  IF v_item.gems > 0 THEN
    v_granted := v_granted || jsonb_build_object('gems', v_item.gems);
  END IF;

  -- N of every type.
  IF v_item.powers > 0 THEN
    FOREACH v_type IN ARRAY ARRAY['5050', 'freeze', 'replace', 'time-drain'] LOOP
      PERFORM public.grant_power_ups(v_user_id, v_type, v_item.powers);
      v_granted := v_granted || jsonb_build_object(v_type, v_item.powers);
    END LOOP;
  END IF;

  -- ...or this many of one type.
  IF v_item.power_type IS NOT NULL THEN
    PERFORM public.grant_power_ups(v_user_id, v_item.power_type, v_item.power_amount);
    v_granted := v_granted || jsonb_build_object(v_item.power_type, v_item.power_amount);
  END IF;

  IF v_item.vip_duration IS NOT NULL THEN
    -- grant_vip_days is revoked from `authenticated` below, but this call
    -- still works: a SECURITY DEFINER body executes as the function owner.
    -- That is the point — the duration mapping and the stacking rule stay in
    -- one place, and the only way in is through a debit.
    PERFORM public.grant_vip_days(v_item.vip_duration);
    v_granted := v_granted || jsonb_build_object('vip_days', v_item.vip_duration);
  END IF;

  IF v_item.frame_id IS NOT NULL THEN
    INSERT INTO public.user_avatar_frames (user_id, frame_id)
    VALUES (v_user_id, v_item.frame_id)
    ON CONFLICT DO NOTHING;
    v_granted := v_granted || jsonb_build_object('frame_id', v_item.frame_id);
  END IF;

  INSERT INTO public.purchase_transactions
    (user_id, product_id, product_type, currency_used, amount_paid, value_received, platform)
  VALUES (v_user_id, p_item_id, 'shop_item', 'gems', v_item.price_gems, v_granted, 'web');

  granted := v_granted;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_shop_item(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item(text) TO authenticated;

-- ── 5. grant_vip_days is no longer a client capability ─────────────────────
--
-- It stays, because it is still the right function: the Stripe webhook, the
-- admin grants and the referral rewards all need a way to add PRO time, and
-- 20260813120000 was right that the duration mapping belongs on this side.
-- What changes is who may call it. Nothing that reaches it from a browser
-- pays for it; purchase_shop_item does.

REVOKE EXECUTE ON FUNCTION public.grant_vip_days(text) FROM authenticated;

-- ── 6. shop_grant stops being a reward kind ────────────────────────────────
--
-- It only ever existed to deliver what a purchase bought, and purchases do
-- not go through credit_gameplay_reward any more. Deleting the row is what
-- closes it: the function raises 'Unknown reward kind' for anything not in
-- this table, so the exploit stops working the moment this runs.

DELETE FROM public.currency_grant_limits WHERE kind = 'shop_grant';

-- ── 7. The coins→gems exchange charges a spread ────────────────────────────
--
-- exchange_currency bought and sold at a flat 500, losslessly, in both
-- directions. The shop sells coins at a BONUS over that rate — deliberately,
-- it is what makes the bigger packs worth buying — so the two together were a
-- loop:
--
--     coins_15000: 24 gems -> 15 000 coins -> exchange back -> 30 gems
--
-- +6 gems a run, unbounded, and both halves were in the shipped UI: the coin
-- packs in the shop and the exchange in CurrencyExchangeModal. Two taps.
--
-- The fix is a spread, which is how every soft-currency economy has always
-- worked: coins are bought at 500 to the gem and sold back at 750. That
-- leaves room for a coin bonus of up to 50% before the loop reopens, and the
-- largest pack pays 25%. src/config/__tests__/shopValue.test.ts asserts the
-- headroom rather than trusting this comment.
--
-- The alternative was capping the coin bonus at zero, which would have
-- removed the reason to buy anything but the smallest pack.

CREATE OR REPLACE FUNCTION public.exchange_currency(
  p_direction text,   -- 'gems_to_coins' | 'coins_to_gems'
  p_amount integer    -- amount of the currency being given up
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  -- What a gem buys.
  v_buy_rate  constant integer := 500;
  -- What a gem costs when buying back. The spread is the whole point; see the
  -- note above this function.
  v_sell_rate constant integer := 750;
  v_coins_delta integer;
  v_gems_delta integer;
  v_current_coins integer;
  v_current_gems integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Exchange amount must be positive';
  END IF;

  IF p_direction = 'gems_to_coins' THEN
    v_gems_delta  := -p_amount;
    v_coins_delta := p_amount * v_buy_rate;
  ELSIF p_direction = 'coins_to_gems' THEN
    -- Integer division on purpose: a partial gem is not a gem. The client
    -- floors the same way when it previews the result.
    IF p_amount < v_sell_rate THEN
      RAISE EXCEPTION 'Need at least % coins to get a gem', v_sell_rate;
    END IF;
    v_gems_delta  := p_amount / v_sell_rate;
    -- Charge only for whole gems, so no remainder is quietly swallowed.
    v_coins_delta := -(v_gems_delta * v_sell_rate);
  ELSE
    RAISE EXCEPTION 'Unknown exchange direction: %', p_direction;
  END IF;

  SELECT coins, gems INTO v_current_coins, v_current_gems
    FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current_coins + v_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  IF v_current_gems + v_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;

  UPDATE profiles
     SET coins = v_current_coins + v_coins_delta,
         gems  = v_current_gems + v_gems_delta,
         updated_at = now()
   WHERE user_id = v_user_id
  RETURNING coins, gems INTO new_coins, new_gems;

  INSERT INTO public.currency_grants (user_id, kind, coins, gems, reference)
  VALUES (v_user_id, 'exchange',
          GREATEST(v_coins_delta, 0), GREATEST(v_gems_delta, 0), p_direction);

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.exchange_currency(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exchange_currency(text, integer) TO authenticated;
