-- Create tv_sessions table for TV game show mode
CREATE TABLE public.tv_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  pairing_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id UUID NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'paired', 'countdown', 'playing', 'reveal', 'completed')),
  current_question_index INTEGER DEFAULT 0,
  question_start_time TIMESTAMPTZ,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Enable RLS
ALTER TABLE public.tv_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for tv_sessions
CREATE POLICY "Anyone can view tv_sessions by code" 
ON public.tv_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tv_sessions" 
ON public.tv_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their tv_sessions" 
ON public.tv_sessions 
FOR UPDATE 
USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete their tv_sessions" 
ON public.tv_sessions 
FOR DELETE 
USING (auth.uid() = host_user_id);

-- Add tv_session_id to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS tv_session_id UUID REFERENCES public.tv_sessions(id);

-- Add tv_session tracking to player_answers
ALTER TABLE public.player_answers
ADD COLUMN IF NOT EXISTS tv_session_id UUID REFERENCES public.tv_sessions(id);

-- Enable realtime for tv_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_sessions;

-- Create index for faster lookups
CREATE INDEX idx_tv_sessions_pairing_code ON public.tv_sessions(pairing_code);
CREATE INDEX idx_tv_sessions_room_id ON public.tv_sessions(room_id);
CREATE INDEX idx_player_answers_tv_session ON public.player_answers(tv_session_id);