-- A room never wears a category's icon — the trigger, executed.
--
-- Read the labels, not the exit code: each says what the row must carry
-- afterwards, and a line doing the opposite is the regression.

\set ON_ERROR_STOP on
\pset pager off

INSERT INTO auth.users (id, email) VALUES
  ('cccccccc-0000-0000-0000-000000000001','icons-host@test')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (user_id, nickname) VALUES
  ('cccccccc-0000-0000-0000-000000000001','IconsHost')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.categories (id, category_id, name, icon, icon_slug)
VALUES ('cccccccc-0000-0000-0000-00000000c001', 'icons-test-astronomy', 'Astronomy (icons test)', '🔭', 'astronaut')
ON CONFLICT (id) DO UPDATE SET icon_slug = EXCLUDED.icon_slug, icon = EXCLUDED.icon;

\echo ''
\echo '=== 1. a room inserted wearing a category''s icon is undressed (must be NULL) ==='
INSERT INTO public.game_rooms (id, room_code, host_user_id, room_name, room_icon, status)
VALUES ('cccccccc-0000-0000-0000-0000000000a1', 'ICNA01', 'cccccccc-0000-0000-0000-000000000001', 'Cosmic clan',
        'https://x.supabase.co/storage/v1/object/public/icon-library/astronaut.png', 'waiting');
SELECT room_icon IS NULL AS undressed FROM public.game_rooms WHERE id = 'cccccccc-0000-0000-0000-0000000000a1';
DO $$ BEGIN
  IF (SELECT room_icon FROM public.game_rooms WHERE id = 'cccccccc-0000-0000-0000-0000000000a1') IS NOT NULL THEN
    RAISE EXCEPTION 'a room kept a category''s icon on insert';
  END IF;
END $$;

\echo ''
\echo '=== 2. the mystery box, with a cache-buster, is undressed too (must be NULL) ==='
INSERT INTO public.game_rooms (id, room_code, host_user_id, room_name, room_icon, status)
VALUES ('cccccccc-0000-0000-0000-0000000000a2', 'ICNA02', 'cccccccc-0000-0000-0000-000000000001', 'Detectives',
        'https://x.supabase.co/storage/v1/object/public/icon-library/mystery-box.png?t=1767636214107', 'waiting');
DO $$ BEGIN
  IF (SELECT room_icon FROM public.game_rooms WHERE id = 'cccccccc-0000-0000-0000-0000000000a2') IS NOT NULL THEN
    RAISE EXCEPTION 'a room kept the mystery box';
  END IF;
END $$;

\echo ''
\echo '=== 3. an icon no category wears stays (must be the panda) ==='
INSERT INTO public.game_rooms (id, room_code, host_user_id, room_name, room_icon, status)
VALUES ('cccccccc-0000-0000-0000-0000000000a3', 'ICNA03', 'cccccccc-0000-0000-0000-000000000001', 'Sleepy pandas',
        'https://x.supabase.co/storage/v1/object/public/icon-library/panda.png', 'waiting');
DO $$ BEGIN
  IF (SELECT room_icon FROM public.game_rooms WHERE id = 'cccccccc-0000-0000-0000-0000000000a3')
     <> 'https://x.supabase.co/storage/v1/object/public/icon-library/panda.png' THEN
    RAISE EXCEPTION 'a room lost an icon no category wears';
  END IF;
END $$;

\echo ''
\echo '=== 4. a later update to a category''s icon is undressed (must be NULL) ==='
UPDATE public.game_rooms
SET room_icon = 'https://x.supabase.co/storage/v1/object/public/icon-library/astronaut.png'
WHERE id = 'cccccccc-0000-0000-0000-0000000000a3';
DO $$ BEGIN
  IF (SELECT room_icon FROM public.game_rooms WHERE id = 'cccccccc-0000-0000-0000-0000000000a3') IS NOT NULL THEN
    RAISE EXCEPTION 'a room kept a category''s icon on update';
  END IF;
END $$;

\echo ''
\echo '=== 5. the helpers are not client entry points (must be false) ==='
SELECT has_function_privilege('anon', 'public.is_category_icon(text)', 'EXECUTE') AS anon_may_call;
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.is_category_icon(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'is_category_icon is callable by anon';
  END IF;
END $$;

DELETE FROM public.game_rooms WHERE id IN (
  'cccccccc-0000-0000-0000-0000000000a1','cccccccc-0000-0000-0000-0000000000a2','cccccccc-0000-0000-0000-0000000000a3');
DELETE FROM public.categories WHERE id = 'cccccccc-0000-0000-0000-00000000c001';
\echo ''
\echo 'room icons: all assertions passed'
