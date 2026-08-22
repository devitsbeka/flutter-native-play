-- A reward kind for achievements.
--
-- The eight achievements in useMissionAchievements carry coins and gems, and
-- the client paid them like this:
--
--   updateProfile({
--     coins: (profile.coins || 0) + definition.reward_coins,
--     gems:  (profile.gems  || 0) + definition.reward_gems,
--   })
--
-- An absolute client-side write to coins and gems, which is the one thing
-- rule 3 exists to prevent. Two ways it goes wrong. update_user_currency
-- refuses a positive delta from a signed-in caller, so on a database with
-- the entitlement migrations applied it simply does not pay. And it reads
-- profile.gems to compute the new total — a column the client is not granted
-- once the wallet lockdown lands, so the read yields nothing and the write
-- sets the player's gems to the reward alone, destroying the rest.
--
-- It never fired, because nothing called checkAndUnlockAchievements. Wiring
-- that up is what makes this urgent rather than theoretical.
--
-- Achievements go through credit_gameplay_reward now, which needs a kind
-- with room for them. 'mission' would not do: it allows 5 gems per call and
-- the thirty-day achievement pays 25, and the function raises rather than
-- clamps, so the top three tiers would have thrown.
--
-- Per call covers the largest single achievement (1000 coins, 25 gems). Per
-- day allows a few to land together — a player finishing a long streak can
-- cross a mission-count threshold on the same day — without leaving the kind
-- open-ended.

INSERT INTO public.currency_grant_limits (kind, max_coins_call, max_gems_call, max_coins_day, max_gems_day)
VALUES ('achievement', 1000, 25, 3000, 60)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;
