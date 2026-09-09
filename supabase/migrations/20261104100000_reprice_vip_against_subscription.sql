-- VIP gem prices, repriced against what the SUBSCRIPTION costs.
--
-- The mirror of REWARDS.VIP_PRICES in src/config/rewardConfig.ts, which moved
-- at the same time; src/__tests__/economyStartingBalance.test.ts reads the
-- latest value for each of these rows out of the migrations and fails if the
-- two disagree.
--
-- WHY, because the numbers look arbitrary and are not:
--
-- VIP is priced in GEMS, which are global. Gems are priced in MONEY, which is
-- per currency. So the real cost of a month of PRO bought with gems is set by
-- whatever the gem rate is in the buyer's currency — and the app carried two
-- different lari rates, 2.75x USD for gems and 1.25x for subscriptions. The
-- result:
--
--     a month of VIP for gems   4.81 GEL   /   $1.75
--     the PRO subscription      4.99 GEL   /   $3.99
--
-- In lari the two agreed. Everywhere else the gem route was PRO at 56% off,
-- with no renewal and no trial attached, and there was no way to fix it with a
-- per-currency VIP price because VIP does not have one. Both halves moved
-- together: gems are 1.25x USD in lari now (src/config/pricing.ts), and these
-- prices are set so that 570 gems is $3.99 AND 4.99 GEL — the subscription
-- price in each.
--
-- Longer periods still buy a better rate: 70, 62.5, 32.9 and 19 gems per day.
--
-- Note this table is a MIRROR for the admin economy screen. The shop charges
-- from REWARDS.VIP_PRICES and, once the purchase function in
-- 20261104110000 is applied, from `shop_catalog`. Changing a number here
-- alone changes no price.

INSERT INTO public.economy_config (id, value, category, description) VALUES
  ('vip_price_day',     70, 'vip', 'Gems for 1 day of VIP'),
  ('vip_price_2days',  125, 'vip', 'Gems for 2 days of VIP (deal only)'),
  ('vip_price_week',   230, 'vip', 'Gems for 1 week of VIP'),
  ('vip_price_month',  570, 'vip', 'Gems for 1 month of VIP — the subscription price, in gems')
ON CONFLICT (id) DO UPDATE
  SET value       = EXCLUDED.value,
      category    = EXCLUDED.category,
      description = EXCLUDED.description;
