-- The admin economy screen stops stating prices the app does not charge.
--
-- `iap_products` was seeded once, in 20260119190510, and never touched again:
--
--     row          said              charges
--     gems_100     $0.80 /  2.00 ₾   $0.99 /  1.24 ₾
--     gems_500     $3.20 /  8.00 ₾   $3.99 /  4.99 ₾
--     gems_1500    $8.00 / 20.00 ₾  $10.99 / 13.74 ₾
--     gems_5000   $24.00 / 60.00 ₾  $34.99 / 43.74 ₾
--
-- It also carried `bonus_percentage` 20 and 40 on the two large packs and
-- described them as "1250 + 20% ბონუსი" — no pack has advertised a bonus since
-- the ladder was unified, and src/config/gemPacks.ts has `bonusGems: 0` on
-- every one.
--
-- Nothing charges from this table: the web checkout charges from
-- _shared/pricing.ts and the App Store charges the tier in App Store Connect.
-- But `useIAPProductsAdmin` reads it and the admin economy tab renders it, so
-- it IS the screen you would open to answer "what do we charge for gems" — and
-- it was wrong on every row, in both currencies, with an editable input beside
-- each one that changed nothing.
--
-- The inputs are gone (IAPProductsTab is a read-only mirror now, and says so).
-- These are the figures it should have been showing.
--
-- The subscriptions are added here for the first time. They are what the app
-- actually sells and the table had never heard of them, which is its own kind
-- of wrong answer.

INSERT INTO public.iap_products
  (id, name, description, price_usd, price_gel, gems_value, bonus_percentage,
   is_active, sort_order, is_subscription)
VALUES
  ('gems_100',  '100 გემი',  '100 გემი MyTrivia-სთვის',   0.99,  1.24,  100, 0, true, 1, false),
  ('gems_500',  '500 გემი',  '500 გემი MyTrivia-სთვის',   3.99,  4.99,  500, 0, true, 2, false),
  ('gems_1500', '1500 გემი', '1500 გემი MyTrivia-სთვის', 10.99, 13.74, 1500, 0, true, 3, false),
  ('gems_5000', '5000 გემი', '5000 გემი MyTrivia-სთვის', 34.99, 43.74, 5000, 0, true, 4, false)
ON CONFLICT (id) DO UPDATE
  SET name             = EXCLUDED.name,
      description      = EXCLUDED.description,
      price_usd        = EXCLUDED.price_usd,
      price_gel        = EXCLUDED.price_gel,
      gems_value       = EXCLUDED.gems_value,
      bonus_percentage = EXCLUDED.bonus_percentage,
      is_active        = EXCLUDED.is_active,
      sort_order       = EXCLUDED.sort_order;

INSERT INTO public.iap_products
  (id, name, description, price_usd, price_gel, gems_value, bonus_percentage,
   is_active, sort_order, is_subscription, subscription_duration_days)
VALUES
  ('io.mytrivia.pro.monthly',     'MyTrivia PRO — Monthly',
   'PRO and 1 friend seat',  3.99,  4.99, NULL, 0, true, 10, true,  30),
  ('io.mytrivia.proplus.monthly', 'MyTrivia Family PRO — Monthly',
   'PRO and 5 friend seats', 7.99,  9.99, NULL, 0, true, 11, true,  30),
  ('io.mytrivia.pro.annual',      'MyTrivia PRO — Annual',
   'PRO and 5 friend seats, billed yearly', 23.88, 59.88, NULL, 0, true, 12, true, 365)
ON CONFLICT (id) DO UPDATE
  SET name                       = EXCLUDED.name,
      description                = EXCLUDED.description,
      price_usd                  = EXCLUDED.price_usd,
      price_gel                  = EXCLUDED.price_gel,
      bonus_percentage           = EXCLUDED.bonus_percentage,
      is_active                  = EXCLUDED.is_active,
      sort_order                 = EXCLUDED.sort_order,
      is_subscription            = EXCLUDED.is_subscription,
      subscription_duration_days = EXCLUDED.subscription_duration_days;

-- Seven rows for products that do not exist.
--
-- `gems_small` / `medium` / `large` / `mega` are the 50/170/600/1500-gem
-- ladder from before the packs were unified — the one gemPacks.ts records as
-- having been two ladders four to eight times apart. `vip_monthly` and
-- `vip_annual` predate the pro/pro_plus tiers and price a year at $39.99,
-- which no screen has ever offered. `ad_free` is a real product id in
-- _shared/iap.ts, but as `io.mytrivia.adfree`, not this.
--
-- Deactivated rather than deleted: this is a reference table an operator
-- reads, and a row that says "Inactive" answers "do we still sell the mega
-- pack" better than a row that is missing.
UPDATE public.iap_products
   SET is_active = false
 WHERE id IN ('gems_small', 'gems_medium', 'gems_large', 'gems_mega',
              'vip_monthly', 'vip_annual', 'ad_free');

-- The Stripe key placeholders go too.
--
-- src/pages/admin/Settings.tsx rendered an input for `stripe_secret_key`,
-- linked to dashboard.stripe.com/apikeys, and saved whatever was typed into
-- this table. No edge function has ever read app_settings — all three Stripe
-- functions use Deno.env.get("STRIPE_SECRET_KEY") — so the form did nothing
-- except invite a live sk_live_… into a Postgres column in plaintext, which is
-- the one place AGENTS.md §5 says real secrets must never go.
--
-- Deleted rather than left empty, so nothing renders a field for them.
DELETE FROM public.app_settings WHERE key IN ('stripe_secret_key', 'stripe_webhook_secret');
