
-- Part 1: Update min_players default
ALTER TABLE game_rooms ALTER COLUMN min_players SET DEFAULT 1;
UPDATE game_rooms SET min_players = 1 WHERE min_players = 2;

-- Part 2: Generate challenge code function
CREATE OR REPLACE FUNCTION public.generate_challenge_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Part 3: challenge_links table
CREATE TABLE public.challenge_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT public.generate_challenge_code(),
  challenger_id UUID NOT NULL,
  challenger_nickname TEXT NOT NULL,
  challenger_avatar_url TEXT,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  category_name TEXT,
  category_icon_slug TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.challenge_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenge links (needed for guests to play)
CREATE POLICY "Anyone can read challenge links"
ON public.challenge_links FOR SELECT
USING (true);

-- Authenticated users can create their own challenge links
CREATE POLICY "Users can create own challenge links"
ON public.challenge_links FOR INSERT
TO authenticated
WITH CHECK (challenger_id = auth.uid());

-- Part 4: challenge_attempts table
CREATE TABLE public.challenge_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_link_id UUID NOT NULL REFERENCES public.challenge_links(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_score INTEGER NOT NULL DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone can read attempts (for leaderboard display)
CREATE POLICY "Anyone can read challenge attempts"
ON public.challenge_attempts FOR SELECT
USING (true);

-- Anyone can insert attempts (guests play without auth)
CREATE POLICY "Anyone can create challenge attempts"
ON public.challenge_attempts FOR INSERT
WITH CHECK (true);

-- Authenticated users can update their own attempts (to link user_id after signup)
CREATE POLICY "Users can update own attempts"
ON public.challenge_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookup by code
CREATE INDEX idx_challenge_links_code ON public.challenge_links(code);
CREATE INDEX idx_challenge_attempts_link_id ON public.challenge_attempts(challenge_link_id);
