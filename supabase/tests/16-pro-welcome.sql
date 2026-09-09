-- The subscription welcome, as assertions.
--
-- What this pins down: PRO and Friends PRO each grant their bundle once, a
-- renewal grants nothing, an upgrade grants the bigger tier's bundle, an
-- expired row grants nothing, ad_free grants nothing, and the amounts come
-- from economy_config so the admin screen decides them.
--
-- The failure it guards against is a welcome that pays monthly: the trigger
-- fires on every write to vip_subscriptions, and the webhook writes on every
-- renewal.

\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.must_equal(got anyelement, want anyelement, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'ASSERTION FAILED: % — got %, wanted %', label, got, want;
  END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.coins_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT coins FROM public.profiles WHERE user_id = u; $$;

CREATE OR REPLACE FUNCTION pg_temp.gems_of(u uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT gems FROM public.profiles WHERE user_id = u; $$;

-- ── fixtures ───────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'solo@example.com'),
  ('e0000000-0000-0000-0000-000000000002', 'friends@example.com'),
  ('e0000000-0000-0000-0000-000000000003', 'upgrader@example.com'),
  ('e0000000-0000-0000-0000-000000000004', 'lapsed@example.com'),
  ('e0000000-0000-0000-0000-000000000005', 'adfree@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, coins, gems)
SELECT id, 'test', 0, 0 FROM auth.users
 WHERE id::text LIKE 'e0000000-%'
ON CONFLICT (user_id) DO UPDATE SET coins = 0, gems = 0;

-- ── a new account opens with the owner's numbers ───────────────────────────

SELECT pg_temp.must_equal(
  (SELECT column_default::text FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins'),
  '5000'::text, 'profiles.coins defaults to 5000');

SELECT pg_temp.must_equal(
  (SELECT column_default::text FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gems'),
  '3'::text, 'profiles.gems defaults to 3');

SELECT pg_temp.must_equal(
  (SELECT value::integer FROM public.economy_config WHERE id = 'new_player_coins'),
  5000, 'economy_config agrees about the starting coins');

-- ── PRO ────────────────────────────────────────────────────────────────────

INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000001', 'pro', now() + interval '30 days');

SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000001'), 25000, 'PRO opens with 25,000 coins');
SELECT pg_temp.must_equal(pg_temp.gems_of('e0000000-0000-0000-0000-000000000001'), 10, 'PRO opens with 10 gems');

-- A renewal is a write to the same row with the same tier. It must pay
-- nothing: this is the whole reason the claim exists.
UPDATE public.vip_subscriptions
   SET expires_at = now() + interval '60 days'
 WHERE user_id = 'e0000000-0000-0000-0000-000000000001';
UPDATE public.vip_subscriptions
   SET expires_at = now() + interval '90 days'
 WHERE user_id = 'e0000000-0000-0000-0000-000000000001';

SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000001'), 25000, 'a renewal grants nothing');
SELECT pg_temp.must_equal(
  (SELECT count(*)::integer FROM public.currency_grants
    WHERE user_id = 'e0000000-0000-0000-0000-000000000001' AND kind = 'pro_welcome'),
  1, 'and leaves exactly one ledger row');

-- ── Friends PRO ────────────────────────────────────────────────────────────

INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000002', 'pro_plus', now() + interval '30 days');

SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000002'), 50000, 'Friends PRO opens with 50,000 coins');
SELECT pg_temp.must_equal(pg_temp.gems_of('e0000000-0000-0000-0000-000000000002'), 20, 'Friends PRO opens with 20 gems');

-- ── an upgrade is a new tier, and gets that tier's bundle ──────────────────

INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000003', 'pro', now() + interval '30 days');
UPDATE public.vip_subscriptions
   SET vip_tier = 'pro_plus'
 WHERE user_id = 'e0000000-0000-0000-0000-000000000003';

SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000003'), 75000, 'an upgrade adds the bigger tier''s bundle');

-- ── what grants nothing ────────────────────────────────────────────────────

INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000004', 'pro', now() - interval '1 day');
SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000004'), 0, 'an expired subscription grants nothing');

INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000005', 'ad_free', now() + interval '3650 days');
SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000005'), 0, 'ad-free is not a subscription tier and grants nothing');

-- ── the amounts are the config's, not the code's ───────────────────────────

UPDATE public.economy_config SET value = 1234 WHERE id = 'pro_welcome_coins';
INSERT INTO auth.users (id, email) VALUES ('e0000000-0000-0000-0000-000000000006', 'config@example.com')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (user_id, nickname, coins, gems)
VALUES ('e0000000-0000-0000-0000-000000000006', 'test', 0, 0)
ON CONFLICT (user_id) DO UPDATE SET coins = 0, gems = 0;
INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('e0000000-0000-0000-0000-000000000006', 'pro', now() + interval '30 days');

SELECT pg_temp.must_equal(pg_temp.coins_of('e0000000-0000-0000-0000-000000000006'), 1234, 'the admin economy screen decides the bundle');
UPDATE public.economy_config SET value = 25000 WHERE id = 'pro_welcome_coins';

-- ── the kind cannot be used to mint from a client ──────────────────────────

SELECT pg_temp.must_equal(
  (SELECT max_coins_call FROM public.currency_grant_limits WHERE kind = 'pro_welcome'),
  0, 'credit_gameplay_reward can grant nothing under this kind');

SELECT 'all pro-welcome assertions passed' AS result;
