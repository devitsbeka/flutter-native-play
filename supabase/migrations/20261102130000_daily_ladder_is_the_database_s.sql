-- The daily ladder in economy_config is the one the database actually pays.
--
-- 20261102100000 wrote every economy_config row from rewardConfig.ts. That
-- was right for the rows the CLIENT decides — the chest, the level-up, the
-- spin, the shop, all of which name their amount and let
-- credit_gameplay_reward bound it — and wrong for the daily reward, which
-- the client does not decide at all.
--
-- claim_daily_reward carries its own ladder (20260913100000):
--
--     day    1   2    3    4    5    6    7
--     coins  50  75  100  125  150  200  300
--     gems    0   0    1    0    2    0    5
--
-- REWARDS.DAILY_REWARDS said 200/300/400/500/750/1000/1500. Nothing reads
-- it — the modal shows the receipt the function returns — so it had drifted
-- unnoticed, and copying it into the table replaced one wrong ladder
-- (100/150/200/250/350/450/500, from the January seed) with another.
--
-- The gems are new rows: the ladder pays them on days 3, 5 and 7 and the
-- table had no way to say so.

INSERT INTO public.economy_config (id, value, category, description) VALUES
  ('daily_reward_day_1',       50, 'daily_rewards', 'Day 1 daily reward coins'),
  ('daily_reward_day_2',       75, 'daily_rewards', 'Day 2 daily reward coins'),
  ('daily_reward_day_3',      100, 'daily_rewards', 'Day 3 daily reward coins'),
  ('daily_reward_day_4',      125, 'daily_rewards', 'Day 4 daily reward coins'),
  ('daily_reward_day_5',      150, 'daily_rewards', 'Day 5 daily reward coins'),
  ('daily_reward_day_6',      200, 'daily_rewards', 'Day 6 daily reward coins'),
  ('daily_reward_day_7',      300, 'daily_rewards', 'Day 7 daily reward coins'),
  ('daily_reward_gems_day_3',   1, 'daily_rewards', 'Day 3 daily reward gems'),
  ('daily_reward_gems_day_5',   2, 'daily_rewards', 'Day 5 daily reward gems'),
  ('daily_reward_gems_day_7',   5, 'daily_rewards', 'Day 7 daily reward gems')
ON CONFLICT (id) DO UPDATE
  SET value       = EXCLUDED.value,
      category    = EXCLUDED.category,
      description = EXCLUDED.description;
