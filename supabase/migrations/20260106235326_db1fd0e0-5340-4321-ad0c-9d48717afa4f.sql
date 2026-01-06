-- Add new columns to tv_sessions for room management
ALTER TABLE public.tv_sessions 
ADD COLUMN IF NOT EXISTS room_name TEXT DEFAULT 'TV კვიზი',
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_rounds_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accumulated_scores JSONB DEFAULT '{}'::jsonb;

-- Create tv_players table for persistent player data in TV sessions
CREATE TABLE public.tv_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tv_session_id UUID REFERENCES public.tv_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  is_host BOOLEAN DEFAULT false,
  is_authenticated BOOLEAN DEFAULT false,
  total_score INTEGER DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  current_round_score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tv_session_id, player_id)
);

-- Create tv_round_history table for persistent round results
CREATE TABLE public.tv_round_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tv_session_id UUID REFERENCES public.tv_sessions(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  category_name TEXT,
  category_id TEXT,
  category_icon TEXT,
  player_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 10,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.tv_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_round_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for tv_players
CREATE POLICY "Anyone can view tv_players"
ON public.tv_players FOR SELECT
USING (true);

CREATE POLICY "Players can insert themselves"
ON public.tv_players FOR INSERT
WITH CHECK (true);

CREATE POLICY "Players can update their own record"
ON public.tv_players FOR UPDATE
USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Host can delete players"
ON public.tv_players FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tv_sessions ts
    WHERE ts.id = tv_session_id AND ts.host_user_id = auth.uid()
  )
  OR (auth.uid() = user_id)
);

-- RLS policies for tv_round_history
CREATE POLICY "Anyone can view tv_round_history"
ON public.tv_round_history FOR SELECT
USING (true);

CREATE POLICY "Host can insert round history"
ON public.tv_round_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tv_sessions ts
    WHERE ts.id = tv_session_id AND ts.host_user_id = auth.uid()
  )
);

-- Enable realtime for tv_players
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_players;

-- Create index for faster queries
CREATE INDEX idx_tv_players_session ON public.tv_players(tv_session_id);
CREATE INDEX idx_tv_round_history_session ON public.tv_round_history(tv_session_id);

-- Create updated_at trigger for tv_players
CREATE TRIGGER update_tv_players_updated_at
BEFORE UPDATE ON public.tv_players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();