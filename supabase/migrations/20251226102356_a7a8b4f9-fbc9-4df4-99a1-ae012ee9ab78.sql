-- Create enum for room and friendship statuses
CREATE TYPE public.room_status AS ENUM ('waiting', 'ready', 'playing', 'completed', 'cancelled');
CREATE TYPE public.participant_status AS ENUM ('joined', 'ready', 'playing', 'finished', 'disconnected');
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- Game rooms for multiplayer
CREATE TABLE public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_user_id UUID NOT NULL,
  status room_status DEFAULT 'waiting',
  category_id TEXT,
  category_name TEXT,
  max_players INTEGER DEFAULT 2,
  total_questions INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Room participants
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  country_code TEXT DEFAULT 'GE',
  joined_at TIMESTAMPTZ DEFAULT now(),
  status participant_status DEFAULT 'joined',
  score INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Friend relationships
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status friendship_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id)
);

-- Room questions (synced for all players)
CREATE TABLE public.room_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  incorrect_answers JSONB NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, question_index)
);

-- Player answers (for real-time sync)
CREATE TABLE public.player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_remaining NUMERIC NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id, question_index)
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rooms
CREATE POLICY "Anyone can view active rooms" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their rooms" ON public.game_rooms
  FOR UPDATE USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete their rooms" ON public.game_rooms
  FOR DELETE USING (auth.uid() = host_user_id);

-- RLS Policies for room_participants
CREATE POLICY "Anyone can view room participants" ON public.room_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON public.room_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_participants
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for room_questions
CREATE POLICY "Participants can view room questions" ON public.room_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp 
      WHERE rp.room_id = room_questions.room_id 
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Host can insert room questions" ON public.room_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_rooms gr 
      WHERE gr.id = room_questions.room_id 
      AND gr.host_user_id = auth.uid()
    )
  );

-- RLS Policies for player_answers
CREATE POLICY "Participants can view answers in their room" ON public.player_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp 
      WHERE rp.room_id = player_answers.room_id 
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own answers" ON public.player_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for multiplayer tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers;

-- Create index for room code lookups
CREATE INDEX idx_game_rooms_code ON public.game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);
CREATE INDEX idx_room_participants_room ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_user ON public.room_participants(user_id);
CREATE INDEX idx_friendships_user ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);

-- Function to generate unique room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;