-- Create room match history table to track all rounds
CREATE TABLE public.room_match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  winner_user_id UUID,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  player_scores JSONB NOT NULL DEFAULT '[]'
);

-- Add indexes
CREATE INDEX idx_room_match_history_room_id ON public.room_match_history(room_id);
CREATE INDEX idx_room_match_history_played_at ON public.room_match_history(played_at DESC);

-- Enable RLS
ALTER TABLE public.room_match_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Participants can view room match history"
  ON public.room_match_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = room_match_history.room_id
    AND rp.user_id = auth.uid()
  ));

CREATE POLICY "Participants can insert match history"
  ON public.room_match_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = room_match_history.room_id
    AND rp.user_id = auth.uid()
  ));

-- Add total wins and rounds to room_participants
ALTER TABLE public.room_participants 
ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rounds_played INTEGER DEFAULT 0;