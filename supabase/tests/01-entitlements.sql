-- Behavioural tests for the entitlement and currency work.
-- Every one of these corresponds to a claim I made in a commit message.

\set ON_ERROR_STOP off
\pset pager off

-- Two players.
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','a@test'),
  ('22222222-2222-2222-2222-222222222222','b@test')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (user_id, nickname, coins, gems) VALUES
  ('11111111-1111-1111-1111-111111111111','A', 1000, 10),
  ('22222222-2222-2222-2222-222222222222','B', 1000, 10)
ON CONFLICT (user_id) DO UPDATE SET coins=1000, gems=10;

-- Impersonate player A as a normal signed-in user.
SET ROLE authenticated;
SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);

\echo ''
\echo '=== 1. Can a signed-in user mint themselves currency? (must FAIL) ==='
SELECT * FROM public.update_user_currency('11111111-1111-1111-1111-111111111111'::uuid, 0, 999999);

\echo ''
\echo '=== 2. Can they drain someone else? (must FAIL) ==='
SELECT * FROM public.update_user_currency('22222222-2222-2222-2222-222222222222'::uuid, -500, 0);

\echo ''
\echo '=== 3. Can they still SPEND their own? (must SUCCEED) ==='
SELECT * FROM public.update_user_currency('11111111-1111-1111-1111-111111111111'::uuid, -100, 0);

\echo ''
\echo '=== 4. Gameplay reward within the cap (must SUCCEED, 150 coins) ==='
SELECT * FROM public.credit_gameplay_reward('level_up', 150, 0, 'level 5');

\echo ''
\echo '=== 5. Gameplay reward OVER the per-award cap (must FAIL: level_up caps at 500) ==='
SELECT * FROM public.credit_gameplay_reward('level_up', 99999, 0, 'nope');

\echo ''
\echo '=== 6. Unknown reward kind (must FAIL) ==='
SELECT * FROM public.credit_gameplay_reward('free_money', 10, 0, NULL);

\echo ''
\echo '=== 7. Daily per-kind cap: level_up allows 5000/day, already used 150 ==='
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'a');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'b');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'c');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'd');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'e');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'f');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'g');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'h');
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'i');
\echo '--- the next one must FAIL (would exceed 5000/day) ---'
SELECT * FROM public.credit_gameplay_reward('level_up', 500, 0, 'j');

\echo ''
\echo '=== 8. Can a user write the subscription table directly? (must FAIL - RLS) ==='
INSERT INTO public.vip_subscriptions (user_id, vip_tier, expires_at)
VALUES ('11111111-1111-1111-1111-111111111111','pro_plus','2099-01-01');

\echo ''
\echo '=== 9. grant_vip_days with a valid duration (must SUCCEED) ==='
SELECT * FROM public.grant_vip_days('week');

\echo ''
\echo '=== 10. grant_vip_days with a bogus duration (must FAIL) ==='
SELECT * FROM public.grant_vip_days('decade');

\echo ''
\echo '=== 11. Stacking: a second week extends rather than resets ==='
SELECT * FROM public.grant_vip_days('week');

\echo ''
\echo '=== 12. Exchange 2 gems -> coins at the server rate (must be +1000 coins) ==='
SELECT * FROM public.exchange_currency('gems_to_coins', 2);

\echo ''
\echo '=== 13. Exchange below one gem of coins (must FAIL) ==='
SELECT * FROM public.exchange_currency('coins_to_gems', 100);

\echo ''
\echo '=== 14. Bogus exchange direction (must FAIL) ==='
SELECT * FROM public.exchange_currency('gems_to_ferraris', 1);

\echo ''
\echo '=== 15. Daily reward claim (must SUCCEED, day 1 = 50 coins) ==='
SELECT * FROM public.claim_daily_reward();

\echo ''
\echo '=== 16. Claiming twice the same day (must FAIL) ==='
SELECT * FROM public.claim_daily_reward();

\echo ''
\echo '=== 17. ensure_admin_lifetime_pro for a non-admin (must return false) ==='
SELECT public.ensure_admin_lifetime_pro();

\echo ''
\echo '=== 18. Claiming a leaderboard reward that is not yours (must FAIL) ==='
RESET ROLE;
INSERT INTO public.category_weekly_rewards
  (id, category_id, user_id, week_start_date, week_end_date, final_rank, coins_rewarded, gems_rewarded)
VALUES ('33333333-3333-3333-3333-333333333333', gen_random_uuid(),
        '22222222-2222-2222-2222-222222222222','2026-08-03','2026-08-09',1, 5000, 20);
SET ROLE authenticated;
SELECT set_config('test.uid','11111111-1111-1111-1111-111111111111', false);
SELECT * FROM public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333');

\echo ''
\echo '=== 19. The rightful owner claims it (must SUCCEED, 5000 coins / 20 gems) ==='
SELECT set_config('test.uid','22222222-2222-2222-2222-222222222222', false);
SELECT * FROM public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333');

\echo ''
\echo '=== 20. Claiming it a second time (must FAIL) ==='
SELECT * FROM public.claim_leaderboard_reward('33333333-3333-3333-3333-333333333333');

\echo ''
\echo '=== FINAL BALANCES ==='
RESET ROLE;
SELECT user_id, coins, gems FROM public.profiles ORDER BY user_id;
\echo '--- ledger ---'
SELECT kind, coins, gems, reference FROM public.currency_grants ORDER BY created_at;
\echo '--- subscription ---'
SELECT user_id, vip_tier, expires_at::date FROM public.vip_subscriptions;
