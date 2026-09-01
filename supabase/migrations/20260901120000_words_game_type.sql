-- Words, the word-wheel crossword mode (src/features/words), joins the game
-- type catalog.
--
-- The seed list in 20260916100000_game_types_registry.sql carries the same
-- row for a database built from scratch; this migration is for the live one,
-- where that migration has already run. game_rooms.game_type_key references
-- game_types(key), so until this row exists a Words room is stored with a
-- null key and game_mode = 'words' — the client falls back to that on its
-- own and reads either shape (src/utils/roomRoutes.ts). Once this is applied
-- new rooms carry the key like every other lounge.
--
-- Live from the start: the mode has no server half. The boards ship in the
-- bundle and a friend game rides on a realtime channel, so there is nothing
-- a dark launch would protect.

INSERT INTO public.game_types
  (key, title, tagline, min_players, max_players, supports_private, supports_matchmaking, is_live, sort_order, badge)
VALUES
  ('words', 'Words', 'Spell words from a wheel of letters. Solo or with a friend.', 1, 2, true, false, true, 50, 'new')
ON CONFLICT (key) DO UPDATE
  SET is_live = EXCLUDED.is_live,
      badge = EXCLUDED.badge,
      sort_order = EXCLUDED.sort_order;
