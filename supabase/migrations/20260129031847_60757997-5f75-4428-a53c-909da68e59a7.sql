-- Add new columns to user_daily_plays for play regeneration system
ALTER TABLE user_daily_plays 
ADD COLUMN IF NOT EXISTS plays_regenerated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_regen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER DEFAULT 0;

-- Update economy_config with new balanced values
-- Daily rewards - reduced
UPDATE economy_config SET value = 100 WHERE id = 'daily_reward_day_1';
UPDATE economy_config SET value = 150 WHERE id = 'daily_reward_day_2';
UPDATE economy_config SET value = 200 WHERE id = 'daily_reward_day_3';
UPDATE economy_config SET value = 250 WHERE id = 'daily_reward_day_4';
UPDATE economy_config SET value = 350 WHERE id = 'daily_reward_day_5';
UPDATE economy_config SET value = 450 WHERE id = 'daily_reward_day_6';
UPDATE economy_config SET value = 500 WHERE id = 'daily_reward_day_7';

-- Chest rewards - reduced
UPDATE economy_config SET value = 100 WHERE id = 'chest_coins_min';
UPDATE economy_config SET value = 150 WHERE id = 'chest_coins_max';
UPDATE economy_config SET value = 6 WHERE id = 'chest_cooldown_hours';

-- New player starting balance - reduced
UPDATE economy_config SET value = 1500 WHERE id = 'new_player_coins';
UPDATE economy_config SET value = 5 WHERE id = 'new_player_gems';

-- Level up coins - reduced
UPDATE economy_config SET value = 75 WHERE id = 'level_up_coins_per_level';

-- VIP prices - increased for better value proposition
UPDATE economy_config SET value = 5 WHERE id = 'vip_price_day';
UPDATE economy_config SET value = 20 WHERE id = 'vip_price_week';
UPDATE economy_config SET value = 50 WHERE id = 'vip_price_month';

-- Add new economy config entries for play regeneration
INSERT INTO economy_config (id, value, category, description) VALUES
  ('play_regen_hours', 4, 'plays', 'Hours to regenerate 1 play'),
  ('play_regen_max', 3, 'plays', 'Maximum regenerated plays that can be stored'),
  ('plays_per_ad', 1, 'plays', 'Plays earned per ad watched'),
  ('max_ads_per_day', 5, 'plays', 'Maximum ads user can watch per day'),
  ('gems_for_plays', 3, 'plays', 'Gems cost for instant plays'),
  ('gems_plays_amount', 2, 'plays', 'Number of plays received for gems')
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;