-- The starting balance, the subscriber's welcome, and an economy_config
-- table that agrees with the app.
--
-- Three numbers had drifted apart, and the one that pays out was the one
-- nobody had looked at.
--
--   * A NEW ACCOUNT is funded by DEFAULTs on profiles.coins/gems — 3000 and
--     10 — set by 20260217110402 and 20260105192314. economy_config says
--     1500 and 5 (20260129031847), rewardConfig.ts said 3000 and 3. Three
--     settings, three answers, and only the column default ever ran.
--
--   * A SUBSCRIPTION granted no currency at all. PRO's benefit is unlimited
--     plays, which is real but invisible on the balance the day somebody
--     pays.
--
--   * economy_config, which the admin economy screen reads and an operator
--     edits, was seeded in January and never caught up: a win paying 1000
--     against a 500 stake, a gem worth 50 coins when exchange_currency
--     gives 500, chest and daily ladders from a previous economy.
--
-- The owner's numbers (owner: "coins and gems should be - after sign up -
-- 5 000 coins and 3 gems, pro solo -25 000 coins + 10 gems, friends pro
-- 50 000 coins + 20 gems, check and fix economy_config values"):
--
--     sign-up       5,000 coins   3 gems
--     PRO          25,000 coins  10 gems   (io.mytrivia.pro.*, tier 'pro')
--     Friends PRO  50,000 coins  20 gems   (proplus/annual, tier 'pro_plus')
--
-- 5,000 is ten games at the 500 stake; the bundles are fifty and a hundred.
--
-- WHAT PAYS THE BUNDLE OUT
--
-- Not this file. The store sync (supabase/functions/_shared/iap.ts) credits
-- it once per person per tier, claiming an iap_events row first so a
-- webhook retry, a renewal or a "restore purchases" cannot pay it twice —
-- the same shape the gem packs already use. The rows below are what the
-- admin screen shows and what the edge function is checked against; the
-- amounts live in code because the function that grants them is code.

-- ── what a new account opens with ─────────────────────────────────────────
--
-- The DEFAULT is the grant: handle_new_user inserts a profile without
-- naming coins or gems, so whatever the column defaults to is what a new
-- player gets. Existing accounts are not touched — this is a starting
-- balance, not a top-up.

ALTER TABLE public.profiles
  ALTER COLUMN coins SET DEFAULT 5000,
  ALTER COLUMN gems  SET DEFAULT 3;

-- ── economy_config, brought level with the app ────────────────────────────
--
-- Every row is written from the same numbers rewardConfig.ts holds, so the
-- screen an operator edits agrees with the economy that actually runs.
-- ON CONFLICT DO UPDATE rather than UPDATE ... WHERE id: a row that never
-- existed (the PRO bundles) has to arrive, and a value an operator has
-- already corrected by hand should land on the same number anyway.

INSERT INTO public.economy_config (id, value, category, description) VALUES
  -- Stakes. A room and a quick game cost the same 500; a win pays 500.
  ('game_stake',                500, 'game_stakes',  'Coins staked per game'),
  ('game_win_reward',           500, 'game_stakes',  'Coins a win pays'),
  ('game_draw_refund',            0, 'game_stakes',  'Coins refunded on a draw'),

  ('level_up_coins_per_level',  150, 'rewards',      'Coins awarded per level gained'),

  -- The seven-day ladder as the app hands it out.
  ('daily_reward_day_1',        200, 'daily_rewards', 'Day 1 daily reward coins'),
  ('daily_reward_day_2',        300, 'daily_rewards', 'Day 2 daily reward coins'),
  ('daily_reward_day_3',        400, 'daily_rewards', 'Day 3 daily reward coins'),
  ('daily_reward_day_4',        500, 'daily_rewards', 'Day 4 daily reward coins'),
  ('daily_reward_day_5',        750, 'daily_rewards', 'Day 5 daily reward coins'),
  ('daily_reward_day_6',       1000, 'daily_rewards', 'Day 6 daily reward coins'),
  ('daily_reward_day_7',       1500, 'daily_rewards', 'Day 7 daily reward coins'),

  ('chest_coins_min',            50, 'chests',       'Minimum coins from a chest'),
  ('chest_coins_max',           250, 'chests',       'Maximum coins from a chest'),
  ('chest_cooldown_hours',       24, 'chests',       'Hours between chest claims'),

  ('spin_reward_1',             100, 'spin_wheel',   'Spin reward tier 1'),
  ('spin_reward_2',             200, 'spin_wheel',   'Spin reward tier 2'),
  ('spin_reward_3',             300, 'spin_wheel',   'Spin reward tier 3'),
  ('spin_reward_4',             500, 'spin_wheel',   'Spin reward tier 4'),
  ('spin_reward_5',             150, 'spin_wheel',   'Spin reward tier 5'),
  ('spin_reward_6',             250, 'spin_wheel',   'Spin reward tier 6'),

  -- One gem is one stake. exchange_currency has always paid 500.
  ('gem_to_coins_rate',         500, 'ratios',       'Coins per gem when exchanging'),

  ('new_player_coins',         5000, 'onboarding',   'Starting coins for new players'),
  ('new_player_gems',             3, 'onboarding',   'Starting gems for new players'),

  -- What a subscription opens with, once per person per tier.
  ('pro_welcome_coins',       25000, 'onboarding',   'Welcome coins on a PRO subscription'),
  ('pro_welcome_gems',           10, 'onboarding',   'Welcome gems on a PRO subscription'),
  ('pro_plus_welcome_coins',  50000, 'onboarding',   'Welcome coins on a Friends PRO subscription'),
  ('pro_plus_welcome_gems',      20, 'onboarding',   'Welcome gems on a Friends PRO subscription'),

  ('powerup_price_5050',        150, 'powerups',     'Price for the 50/50 power-up'),
  ('powerup_price_freeze',      100, 'powerups',     'Price for the freeze power-up'),
  ('powerup_price_replace',      75, 'powerups',     'Price for the replace power-up'),
  ('powerup_price_time_drain',  100, 'powerups',     'Price for the time-drain power-up'),

  ('play_regen_hours',            3, 'plays',        'Hours to regenerate 1 play'),
  ('play_regen_max',              1, 'plays',        'Maximum regenerated plays stored'),
  ('plays_per_ad',                1, 'plays',        'Plays earned per ad watched'),
  ('max_ads_per_day',             5, 'plays',        'Maximum ads a user may watch per day'),
  ('gems_for_plays',              2, 'plays',        'Gems cost for instant plays'),
  ('gems_plays_amount',           2, 'plays',        'Plays granted for that gem cost')
ON CONFLICT (id) DO UPDATE
  SET value       = EXCLUDED.value,
      category    = EXCLUDED.category,
      description = EXCLUDED.description;
