-- The shop's purchase path, executed.
--
-- Every case here is one of the holes the audit found, or one of the things
-- that had to keep working while they were closed. Run it the way the README
-- describes; read the labels, not the exit code — each one says whether it
-- must succeed or must fail, and a line doing the opposite is the regression.

\set ON_ERROR_STOP off
\pset pager off

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','shopper@test'),
  ('aaaaaaaa-0000-0000-0000-000000000002','other@test')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','Shopper', 0, 1000),
  ('aaaaaaaa-0000-0000-0000-000000000002','Other', 0, 5)
ON CONFLICT (user_id) DO UPDATE SET coins=EXCLUDED.coins, gems=EXCLUDED.gems;

SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);

\echo ''
\echo '######## The three free-grant holes ########'

\echo ''
\echo '=== 1. grant_vip_days straight from the client (must FAIL: permission denied) ==='
-- The headline hole. Granted to `authenticated`, took a duration and nothing
-- else, and stacked — so a loop in the browser console was unlimited PRO.
SELECT * FROM public.grant_vip_days('month');

\echo ''
\echo '=== 2. credit_gameplay_reward with kind shop_grant (must FAIL: unknown kind) ==='
-- Was capped at 200 000 coins / 500 gems a call and a million / 2 000 a day,
-- with no evidence a purchase happened. The row is deleted, so the function
-- refuses the kind outright.
SELECT * FROM public.credit_gameplay_reward('shop_grant', 200000, 500, NULL);

\echo ''
\echo '=== 3. adjust_power_up with a POSITIVE delta (must FAIL) ==='
SELECT public.adjust_power_up('5050', 9999);

\echo ''
\echo '=== 4. adjust_power_up with a negative delta — spending one (must SUCCEED) ==='
SELECT public.ensure_default_power_ups();
SELECT public.adjust_power_up('5050', -1) AS remaining;

\echo ''
\echo '=== 5. Writing user_power_ups directly (must FAIL / affect 0 rows - RLS) ==='
INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','freeze',9999);
UPDATE public.user_power_ups SET quantity = 9999
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SELECT power_up_type, quantity FROM public.user_power_ups
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' ORDER BY 1;

\echo ''
\echo '=== 6. Unlocking an avatar frame for free (must FAIL / affect 0 rows - RLS) ==='
INSERT INTO public.user_avatar_frames (user_id, frame_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','golden');
SELECT count(*) AS frames_owned FROM public.user_avatar_frames
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

\echo ''
\echo '######## The purchase path that replaces them ########'

\echo ''
\echo '=== 7. Buying a coin pack: 24 gems for 15 000 coins (must SUCCEED) ==='
SELECT * FROM public.purchase_shop_item('coins_15000');

\echo ''
\echo '=== 8. Buying VIP: debit and entitlement in ONE call (must SUCCEED) ==='
SELECT * FROM public.purchase_shop_item('vip_month');
RESET ROLE;
SELECT vip_tier, expires_at > now() + interval '27 days' AS at_least_a_month
  FROM public.vip_subscriptions
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;

\echo ''
\echo '=== 9. Buying a frame (must SUCCEED, and the frame is now owned) ==='
SELECT * FROM public.purchase_shop_item('frame_golden');
RESET ROLE;
SELECT frame_id FROM public.user_avatar_frames
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' ORDER BY 1;
SET ROLE authenticated;

\echo ''
\echo '=== 10. Buying a bundle: N of every power type at once (must SUCCEED) ==='
SELECT * FROM public.purchase_shop_item('power_bundle_large');
RESET ROLE;
SELECT power_up_type, quantity FROM public.user_power_ups
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001' ORDER BY 1;
SET ROLE authenticated;

\echo ''
\echo '=== 11. An unknown item id (must FAIL rather than granting a default) ==='
SELECT * FROM public.purchase_shop_item('gems_1000000');

\echo ''
\echo '=== 12. Buying without the gems for it (must FAIL: insufficient gems) ==='
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
SELECT * FROM public.purchase_shop_item('vip_month');

\echo ''
\echo '=== 13. ...and nothing was granted to them (must show no subscription) ==='
RESET ROLE;
SELECT count(*) AS subscriptions FROM public.vip_subscriptions
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
SET ROLE authenticated;

\echo ''
\echo '######## The exchange loop ########'
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);

\echo ''
\echo '=== 14. The old arbitrage, run end to end (must LOSE gems, not gain) ==='
-- Was: 24 gems -> coins_15000 -> 15 000 coins -> exchange back -> 30 gems.
-- +6 a run, unbounded, both halves in the shipped UI.
RESET ROLE;
UPDATE public.profiles SET coins = 0, gems = 100
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SELECT gems AS gems_before FROM public.profiles
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT * FROM public.purchase_shop_item('coins_15000');
SELECT * FROM public.exchange_currency('coins_to_gems', 15000);
\echo '--- gems_after must be BELOW 100. It was 106. ---'
RESET ROLE;
SELECT gems AS gems_after FROM public.profiles
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);

\echo ''
\echo '=== 15. Gems to coins still pays the buy rate, 500 (must SUCCEED) ==='
RESET ROLE;
UPDATE public.profiles SET coins = 0, gems = 10
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT * FROM public.exchange_currency('gems_to_coins', 10);

\echo ''
\echo '=== 16. Coins to gems charges the sell rate, 750 (7500 coins -> 10 gems) ==='
SELECT * FROM public.exchange_currency('coins_to_gems', 5000);

\echo ''
\echo '=== 17. Under one gem''s worth of coins (must FAIL: needs 750) ==='
RESET ROLE;
UPDATE public.profiles SET coins = 700 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT * FROM public.exchange_currency('coins_to_gems', 700);

\echo ''
\echo '######## Power-ups: bought with coins, and awarded ########'

\echo ''
\echo '=== 18. Buying a power-up with coins (must SUCCEED, 150 coins for 5050) ==='
RESET ROLE;
UPDATE public.profiles SET coins = 1000, gems = 0
 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT * FROM public.purchase_power_up('5050', 2);

\echo ''
\echo '=== 19. time-drain resolves its economy_config row (must SUCCEED, not raise) ==='
-- The row is powerup_price_time_drain, and the type is `time-drain`. Getting
-- that mapping wrong raises rather than selling for nothing, which is the
-- point of the refusal — but it would still be a broken button.
SELECT * FROM public.purchase_power_up('time-drain', 1);

\echo ''
\echo '=== 20. Buying a power-up with no coins (must FAIL) ==='
RESET ROLE;
UPDATE public.profiles SET coins = 0 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT * FROM public.purchase_power_up('5050', 1);

\echo ''
\echo '=== 21. An awarded power-up within the cap (must SUCCEED) ==='
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1) AS owned;

\echo ''
\echo '=== 22. Over the per-award cap (must FAIL: ad_reward allows 1) ==='
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 99);

\echo ''
\echo '=== 23. The daily cap: ad_reward allows 5, one is spent ==='
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1);
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1);
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1);
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1);
\echo '--- the next one must FAIL (would be a sixth ad today) ---'
SELECT public.grant_reward_power_up('ad_reward', 'freeze', 1);

\echo ''
\echo '=== 24. An unknown reward kind (must FAIL) ==='
SELECT public.grant_reward_power_up('free_powers', 'freeze', 1);

\echo ''
\echo '=== 25. An unknown power type (must FAIL) ==='
SELECT public.grant_reward_power_up('spin', 'instant_win', 1);

\echo ''
\echo '######## Subscriber frames ########'

\echo ''
\echo '=== 26. Claiming a subscriber frame WITHOUT a subscription (must FAIL) ==='
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
SELECT public.claim_vip_frame('vip-crown');

\echo ''
\echo '=== 27. Claiming one WITH a subscription (must SUCCEED) ==='
-- Player 1 bought a month of VIP in case 8.
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT public.claim_vip_frame('vip-crown');

\echo ''
\echo '=== 28. Claiming a PAID frame through the free path (must FAIL) ==='
SELECT public.claim_vip_frame('golden');

\echo ''
\echo '######## The catalogue itself ########'
RESET ROLE;

\echo ''
\echo '=== 29. No catalogue row can mint more gems than it costs ==='
SELECT count(*) AS rows_that_mint FROM public.shop_catalog WHERE gems >= price_gems;

\echo ''
\echo '=== 30. Nothing is free (price_gems > 0 on every row) ==='
SELECT count(*) AS free_rows FROM public.shop_catalog WHERE price_gems <= 0;

\echo ''
\echo '=== 31. Every VIP row names a duration grant_vip_days understands ==='
SELECT count(*) AS unknown_durations FROM public.shop_catalog
 WHERE vip_duration IS NOT NULL
   AND vip_duration NOT IN ('day','2days','week','10days','month');

\echo ''
\echo '=== 32. A signed-in user cannot rewrite the catalogue (must FAIL - RLS) ==='
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
UPDATE public.shop_catalog SET price_gems = 1 WHERE id = 'vip_month';
SELECT id, price_gems FROM public.shop_catalog WHERE id = 'vip_month';
RESET ROLE;

\echo ''
\echo '######## Avatar generation: charged by the server, capped by it too ########'

RESET ROLE;
UPDATE public.profiles SET gems = 3 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
DELETE FROM public.avatar_generation_claims WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

\echo ''
\echo '=== 33. claim_avatar_generation is NOT callable by a signed-in client (must FAIL) ==='
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000002', false);
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', true);
RESET ROLE;

\echo ''
\echo '=== 34. First generation is inside the included allowance (must return free) ==='
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', true) AS outcome;

\echo ''
\echo '=== 35. The second costs a gem (must return charged, 3 -> 2 gems) ==='
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', true) AS outcome;
SELECT gems FROM public.profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

\echo ''
\echo '=== 36. A derived portrait is never charged (must return free, gems unchanged) ==='
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', false) AS outcome;
SELECT gems FROM public.profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

\echo ''
\echo '=== 37. Refund puts the gem back (2 -> 3) ==='
SELECT public.refund_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002');
SELECT gems FROM public.profiles WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

\echo ''
\echo '=== 38. Out of gems, over the allowance (must FAIL: insufficient gems) ==='
UPDATE public.profiles SET gems = 0 WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', true);

\echo ''
\echo '=== 39. The daily ceiling applies to NON-billable claims too (must FAIL at 20) ==='
-- The whole point: a caller that lies about `billable` to dodge the gem gets a
-- day''s allowance, not an unlimited one.
DELETE FROM public.avatar_generation_claims WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
INSERT INTO public.avatar_generation_claims (user_id, charged, billable)
SELECT 'aaaaaaaa-0000-0000-0000-000000000002', false, false FROM generate_series(1, 20);
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', false);

\echo ''
\echo '=== 40. Nobody can claim on another account (must FAIL) ==='
SET ROLE authenticated;
SELECT set_config('test.uid','aaaaaaaa-0000-0000-0000-000000000001', false);
SELECT public.claim_avatar_generation('aaaaaaaa-0000-0000-0000-000000000002', true);
RESET ROLE;
