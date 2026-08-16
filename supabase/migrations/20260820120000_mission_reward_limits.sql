-- Let the mission rewards the app actually grants through the currency guard.
--
-- `credit_gameplay_reward` bounds every award against currency_grant_limits.
-- The 'mission' row was seeded at 1000 coins / 5 gems per call, but three
-- things the app grants under that kind are larger, and each of them has been
-- failing outright:
--
--   week package (useMissions WEEK_BONUS)   2000 coins, 10 gems
--   30-day streak bonus (useMissionStreak)   300 coins, 15 gems
--   richest daily mission (DAILY_POOL)       600 coins, 15 gems
--
-- The call raises 'Reward of N coins / M gems exceeds the per-award limit for
-- mission' and the player is credited nothing — while the client has already
-- flipped reward_claimed, so the prize is spent on a payout that never
-- happened. Verified against a database with every migration applied: 1000/5
-- succeeds, 1001/5 and 1000/6 both raise.
--
-- The daily ceiling was short for the same reason. The most a single day can
-- legitimately pay under this kind:
--
--   5 missions, richest consecutive rotation window   2100 coins, 42 gems
--   day bonus                                          150 coins,  0 gems
--   week package                                      2000 coins, 10 gems
--   30-day streak                                      300 coins, 15 gems
--   ────────────────────────────────────────────────────────────────────
--                                                     4550 coins, 67 gems
--
-- 10000 coins already covers that with room to spare; 30 gems did not.
--
-- These stay bounds, not a blank cheque: the new numbers are the largest the
-- app can hand out plus a margin for one more rich mission, well under what a
-- caller looping the RPC would want. src/__tests__/missionRewardLimits.test.ts
-- compares the client's constants against the numbers below, so the next
-- reward that outgrows them fails CI instead of paying nobody.

INSERT INTO public.currency_grant_limits
  (kind,      max_coins_call, max_gems_call, max_coins_day, max_gems_day) VALUES
  ('mission',           2500,            20,         10000,           80)
ON CONFLICT (kind) DO UPDATE
  SET max_coins_call = EXCLUDED.max_coins_call,
      max_gems_call  = EXCLUDED.max_gems_call,
      max_coins_day  = EXCLUDED.max_coins_day,
      max_gems_day   = EXCLUDED.max_gems_day;
