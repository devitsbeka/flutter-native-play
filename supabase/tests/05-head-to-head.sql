-- Behavioural tests for the profile's "against each other" panel.
--
-- The rule that needs pinning is the one that is not obvious: a win is the
-- higher score in a match you both played, NOT winning the room. In a room of
-- eight, finishing above someone is beating them even though a third player
-- took the room. Getting that wrong is invisible — the number just reads low
-- — so each case below states what it must return.

\set ON_ERROR_STOP off
\pset pager off

\set ME    '11111111-1111-1111-1111-111111111111'
\set THEM  '22222222-2222-2222-2222-222222222222'
\set THIRD '33333333-3333-3333-3333-333333333333'

INSERT INTO auth.users (id) VALUES (:'ME'), (:'THEM'), (:'THIRD')
ON CONFLICT DO NOTHING;

DELETE FROM public.room_match_history
 WHERE player_scores @> jsonb_build_array(jsonb_build_object('user_id', :'ME'));

INSERT INTO public.room_match_history (room_id, winner_user_id, player_scores) VALUES
  -- A duel each.
  (gen_random_uuid(), :'ME',   format('[{"user_id":"%s","score":90},{"user_id":"%s","score":40}]', :'ME', :'THEM')::jsonb),
  (gen_random_uuid(), :'THEM', format('[{"user_id":"%s","score":20},{"user_id":"%s","score":75}]', :'ME', :'THEM')::jsonb),
  -- Four-player room won OUTRIGHT by a third player, with me above them.
  -- This is the case the whole rule exists for.
  (gen_random_uuid(), :'THIRD', format('[{"user_id":"%s","score":150},{"user_id":"%s","score":120},{"user_id":"%s","score":60}]', :'THIRD', :'ME', :'THEM')::jsonb),
  -- Same shape, they placed above me.
  (gen_random_uuid(), :'THIRD', format('[{"user_id":"%s","score":200},{"user_id":"%s","score":130},{"user_id":"%s","score":55}]', :'THIRD', :'THEM', :'ME')::jsonb),
  -- Level scores: a draw, given to neither side.
  (gen_random_uuid(), :'ME',   format('[{"user_id":"%s","score":70},{"user_id":"%s","score":70}]', :'ME', :'THEM')::jsonb),
  -- A room they played without me: must not appear in our record at all.
  (gen_random_uuid(), :'THIRD', format('[{"user_id":"%s","score":80},{"user_id":"%s","score":30}]', :'THIRD', :'THEM')::jsonb);

INSERT INTO public.categories (id, category_id, name, icon, color, type, is_active, total_levels, sort_order)
VALUES (gen_random_uuid(),'t_geography','გეოგრაფია','🌍','from-blue-400 to-blue-500','classic',true,10,1),
       (gen_random_uuid(),'t_flukey','იღბალი','🍀','from-lime-400 to-lime-500','classic',true,10,2)
ON CONFLICT (category_id) DO NOTHING;

DELETE FROM public.category_stats WHERE user_id = :'THEM';
INSERT INTO public.category_stats (user_id, category, total_answers, correct_answers) VALUES
  (:'THEM','t_geography', 120, 100),  -- 83% over a real sample
  (:'THEM','t_flukey',      2,   2);  -- 100% over two answers

SET ROLE authenticated;
SELECT set_config('test.uid', :'ME', false);

\echo ''
\echo '=== 1. Our record (must be: 5 together, 2 mine, 2 theirs, 1 draw) ==='
\echo '    The 6th match is theirs alone and must not be counted.'
SELECT * FROM public.head_to_head_record(:'THEM'::uuid);

\echo ''
\echo '=== 2. The same record from their side (must mirror: 2 theirs, 2 mine) ==='
SELECT set_config('test.uid', :'THEM', false);
SELECT * FROM public.head_to_head_record(:'ME'::uuid);

\echo ''
\echo '=== 3. Signed out has no side (must be all zeros, not an error) ==='
SELECT set_config('test.uid', '', false);
SELECT * FROM public.head_to_head_record(:'THEM'::uuid);

\echo ''
\echo '=== 4. Your record against yourself is nothing (must be all zeros) ==='
SELECT set_config('test.uid', :'ME', false);
SELECT * FROM public.head_to_head_record(:'ME'::uuid);

\echo ''
\echo '=== 5. Specialty ignores a lucky one-off (must be geography, not flukey) ==='
SELECT category_slug, total_answers, accuracy
  FROM public.best_category_for_user(:'THEM'::uuid);

\echo ''
\echo '=== 6. Drop the floor to 1 and the fluke wins (shows the floor is load-bearing) ==='
SELECT category_slug, accuracy FROM public.best_category_for_user(:'THEM'::uuid, 1);

RESET ROLE;
