-- Create a dedicated table to track every game play (not just best scores)
CREATE TABLE public.game_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT,
  level_number INTEGER,
  game_type TEXT NOT NULL DEFAULT 'category', -- 'category', 'multiplayer', 'challenge', etc.
  room_id UUID, -- For multiplayer games
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient daily queries
CREATE INDEX idx_game_plays_played_at ON public.game_plays(played_at);
CREATE INDEX idx_game_plays_user_id ON public.game_plays(user_id);

-- Enable Row Level Security
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own plays
CREATE POLICY "Users can insert their own game plays"
ON public.game_plays
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own plays
CREATE POLICY "Users can view their own game plays"
ON public.game_plays
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to view all plays for analytics
CREATE POLICY "Admins can view all game plays"
ON public.game_plays
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);