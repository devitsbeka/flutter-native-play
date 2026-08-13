-- Buying your way past the five-per-three-hours wall.
--
-- Running out of free games used to open an "invite your friends" offer, and
-- behind it the PRO upsell. Both ask the player to do something other than
-- what they came here to do — play. This adds the third answer: pay for the
-- next game or three, with what they already have.
--
--   1 game  — 500 coins,  1 gem, or one rewarded ad
--   3 games — 1500 coins, 3 gems
--
-- Priced HERE and nowhere else. The client sends which pack and how it is
-- paying, never how much: a price the phone can name is a price the phone can
-- set to zero. src/config/extraPlays.ts mirrors these numbers for the UI and
-- is checked against this list by its own test — if the two ever disagree,
-- this file is the one that decides what the player is charged.
--
-- Ads are the exception that needs its own ceiling. Nothing is debited for
-- one, and the server cannot see the ad, so "I watched an ad" is a claim any
-- client can make repeatedly. free_plays_ad_grants caps how many games that
-- claim is worth per window; the cap resets with the window, alongside the
-- quota it belongs to.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_plays_ad_grants integer NOT NULL DEFAULT 0;

-- Readable by the owner's client so the UI can hide an ad button that would
-- only be refused. Mirrors the existing column-list grant.
GRANT SELECT (free_plays_ad_grants)
  ON public.profiles TO anon, authenticated;


-- consume_free_play, unchanged except that a fresh window now also clears the
-- ad allowance. Replaced whole rather than patched: the body is the contract
-- for what a play costs, and reading it in one piece is the point.
CREATE OR REPLACE FUNCTION public.consume_free_play()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_free_plays   constant integer := 5;
  v_window       constant interval := interval '3 hours';
  v_start        timestamptz;
  v_used         integer;
  v_now          timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT free_plays_window_start, COALESCE(free_plays_used, 0)
    INTO v_start, v_used
  FROM profiles WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  -- A window that never started, or has aged out, begins now — and takes the
  -- ad allowance with it.
  IF v_start IS NULL OR v_now - v_start >= v_window THEN
    UPDATE profiles
       SET free_plays_window_start = v_now,
           free_plays_used = 1,
           free_plays_ad_grants = 0
     WHERE user_id = v_uid;
    RETURN jsonb_build_object(
      'allowed', true, 'used', 1, 'limit', v_free_plays,
      'remaining', v_free_plays - 1,
      'window_start', v_now,
      'resets_in_seconds', EXTRACT(EPOCH FROM v_window)::integer);
  END IF;

  IF v_used >= v_free_plays THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'window_exhausted',
      'used', v_used, 'limit', v_free_plays, 'remaining', 0,
      'window_start', v_start,
      'resets_in_seconds',
        GREATEST(0, EXTRACT(EPOCH FROM (v_start + v_window - v_now))::integer));
  END IF;

  UPDATE profiles
     SET free_plays_used = v_used + 1
   WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'allowed', true, 'used', v_used + 1, 'limit', v_free_plays,
    'remaining', v_free_plays - (v_used + 1),
    'window_start', v_start,
    'resets_in_seconds',
      GREATEST(0, EXTRACT(EPOCH FROM (v_start + v_window - v_now))::integer));
END;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, and
-- CREATE OR REPLACE on an existing one does not restore what was revoked from
-- it — so both of these say who may call them rather than assuming.
REVOKE ALL ON FUNCTION public.consume_free_play() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_free_play() FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_free_play() TO authenticated;


-- Charge for a pack of extra games and hand them over, atomically.
--
-- Giving games back is spending the quota downwards: free_plays_used drops by
-- the size of the pack, inside the same row lock that takes the payment, so a
-- debit can never land without the games or the other way round.
--
-- The pack is refused unless the player has actually used that many games
-- this window. Someone with two games left buying a pack of three would be
-- paying full price for two — the quota floors at zero and the difference
-- goes nowhere. Refusing is the only honest answer; the modal that offers
-- this only opens at nothing left, so nobody meets it in normal play.
CREATE OR REPLACE FUNCTION public.buy_extra_plays(p_games integer, p_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_free_plays   constant integer := 5;
  v_window       constant interval := interval '3 hours';
  -- How many games one window's worth of ad-watching can be worth. Well above
  -- the one ad a player is offered at a time, so the cap is a backstop
  -- against a replayed call rather than something honest play runs into.
  v_max_ad_plays constant integer := 3;
  v_coin_price   integer;
  v_gem_price    integer;
  v_start        timestamptz;
  v_used         integer;
  v_ad_grants    integer;
  v_coins        integer;
  v_gems         integer;
  v_now          timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  IF p_games = 1 THEN
    v_coin_price := 500;
    v_gem_price := 1;
  ELSIF p_games = 3 THEN
    v_coin_price := 1500;
    v_gem_price := 3;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_pack');
  END IF;

  IF p_source NOT IN ('coins', 'gems', 'ad') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_source');
  END IF;

  -- One ad, one game. The bigger pack has a price in both currencies and no
  -- ad-shaped way around it.
  IF p_source = 'ad' AND p_games <> 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_pack');
  END IF;

  SELECT free_plays_window_start,
         COALESCE(free_plays_used, 0),
         COALESCE(free_plays_ad_grants, 0),
         COALESCE(coins, 0),
         COALESCE(gems, 0)
    INTO v_start, v_used, v_ad_grants, v_coins, v_gems
  FROM profiles WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;

  -- A window that never opened, or has aged out, is already a fresh five.
  IF v_start IS NULL OR v_now - v_start >= v_window THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'nothing_to_buy',
      'used', 0, 'limit', v_free_plays, 'remaining', v_free_plays);
  END IF;

  IF v_used < p_games THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'nothing_to_buy',
      'used', v_used, 'limit', v_free_plays, 'remaining', v_free_plays - v_used);
  END IF;

  IF p_source = 'ad' AND v_ad_grants + p_games > v_max_ad_plays THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'ad_limit',
      'used', v_used, 'limit', v_free_plays, 'remaining', v_free_plays - v_used);
  END IF;

  IF p_source = 'coins' AND v_coins < v_coin_price THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'insufficient_funds',
      'price', v_coin_price, 'coins', v_coins, 'gems', v_gems);
  END IF;

  IF p_source = 'gems' AND v_gems < v_gem_price THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'insufficient_funds',
      'price', v_gem_price, 'coins', v_coins, 'gems', v_gems);
  END IF;

  UPDATE profiles
     SET coins = coins - CASE WHEN p_source = 'coins' THEN v_coin_price ELSE 0 END,
         gems  = gems  - CASE WHEN p_source = 'gems'  THEN v_gem_price  ELSE 0 END,
         free_plays_used = v_used - p_games,
         free_plays_ad_grants = v_ad_grants
           + CASE WHEN p_source = 'ad' THEN p_games ELSE 0 END
   WHERE user_id = v_uid
   RETURNING coins, gems, free_plays_used
        INTO v_coins, v_gems, v_used;

  RETURN jsonb_build_object(
    'ok', true,
    'used', v_used, 'limit', v_free_plays, 'remaining', v_free_plays - v_used,
    'window_start', v_start,
    'coins', v_coins, 'gems', v_gems,
    'resets_in_seconds',
      GREATEST(0, EXTRACT(EPOCH FROM (v_start + v_window - v_now))::integer));
END;
$$;

REVOKE ALL ON FUNCTION public.buy_extra_plays(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buy_extra_plays(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_extra_plays(integer, text) TO authenticated;
