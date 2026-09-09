-- The three economy_config rows the level-up missed.
--
-- 20261102100000 rewrote every row it knew about from rewardConfig.ts and
-- left the rows it did not, which turned out to be the three furthest from
-- the truth. Found by reading the LIVE table back after that migration was
-- applied and diffing all of it against the app, rather than only the rows
-- the migration names.
--
--   vip_price_day / week / month  said 5 / 20 / 50 gems. The shop charges
--     REWARDS.VIP_PRICES — 30 / 100 / 250 — and has since the day the gem
--     was repriced at 500 coins. The old numbers are from the economy where
--     a gem was worth 50, so they read as an 83% discount that no screen
--     has ever offered. vip_price_2days did not exist at all; the shop
--     sells one.
--
--   ad_watch_coins said 50. An ad has not paid coins since the play
--     regeneration system landed: it pays a PLAY (plays_per_ad, which the
--     table already carries correctly). REWARDS.AD_WATCH_COINS is 0 and
--     marked deprecated. Zero is the honest number; the row is kept rather
--     than deleted so an operator reading the table sees the answer instead
--     of an absence.
--
-- feed_trivia_xp_per_correct was the fourth uncovered row and was already
-- right, which is why it is not here.

INSERT INTO public.economy_config (id, value, category, description) VALUES
  ('vip_price_day',    30, 'vip',  'Gems for 1 day of VIP'),
  ('vip_price_2days',  55, 'vip',  'Gems for 2 days of VIP (deal only)'),
  ('vip_price_week',  100, 'vip',  'Gems for 1 week of VIP'),
  ('vip_price_month', 250, 'vip',  'Gems for 1 month of VIP'),
  ('ad_watch_coins',    0, 'ads',  'Coins for watching an ad — an ad pays a play, not coins')
ON CONFLICT (id) DO UPDATE
  SET value       = EXCLUDED.value,
      category    = EXCLUDED.category,
      description = EXCLUDED.description;
