-- The game type registry (docs/GAME_TYPES_DESIGN.md §4).
--
-- game_rooms.game_mode is free text doing double duty as a mode flag and a
-- content pointer ('tv_show', 'trivia:<id>', 'collection:<id>', ...). New game
-- types get a real catalog instead: one row per type, read-only for clients,
-- with liveness flags so a mode can be dark-launched by a data change rather
-- than a client release. The /play chooser renders from this table (with a
-- client-side fallback while the migration is not yet deployed — see
-- src/game-types/registry.ts).
--
-- game_mode itself is untouched: existing rows keep their values, and the new
-- game_type_key column is written alongside going forward. Old rows with a
-- null key are treated as 'classic'.

CREATE TABLE IF NOT EXISTS public.game_types (
  key text PRIMARY KEY,
  title text NOT NULL,
  tagline text NOT NULL,
  min_players int NOT NULL CHECK (min_players >= 1),
  max_players int NOT NULL CHECK (max_players >= min_players),
  supports_private boolean NOT NULL DEFAULT true,
  supports_matchmaking boolean NOT NULL DEFAULT false,
  is_live boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  badge text CHECK (badge IN ('new', 'beta')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;

-- The catalog is public — guests see the chooser too. There are deliberately
-- no INSERT/UPDATE/DELETE policies: with RLS enabled and no policy, client
-- writes are refused. Changes go through migrations.
DROP POLICY IF EXISTS "game_types_readable_by_all" ON public.game_types;
CREATE POLICY "game_types_readable_by_all"
  ON public.game_types FOR SELECT
  USING (true);

INSERT INTO public.game_types
  (key, title, tagline, min_players, max_players, supports_private, supports_matchmaking, is_live, sort_order, badge)
VALUES
  ('classic',     'Classic Trivia', 'Create a room and battle your friends',            2, 8,  true, false, true,  10, NULL),
  ('tv_show',     'TV Party',       'One big screen, phones as controllers',            2, 12, true, false, true,  20, NULL),
  -- Dark-launched: visible as "coming soon" teasers while is_live is false
  -- (a badge with is_live=false renders as a teaser; no badge would hide it).
  ('team_battle', 'Team Battle',    'Two teams, a board of priced categories',          2, 10, true, true,  false, 30, 'beta'),
  ('king',        'MyTrivia King',  'Hard logic questions. One minute. First to 6.',    1, 1,  true, false, false, 40, 'beta'),
  -- Words: a word-wheel crossword, solo or with one friend. Live on arrival —
  -- it has no server half to gate (see supabase/migrations/20260901120000_words_game_type.sql).
  ('words',       'Words',          'Spell words from a wheel of letters. Solo or with a friend.', 1, 2, true, false, true, 50, 'new')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS game_type_key text REFERENCES public.game_types(key);
