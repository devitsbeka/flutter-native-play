-- Phase 1: Database Schema Cleanup for Simplified Game Rooms

-- 1.1 Create room_games table to track individual games within persistent rooms
CREATE TABLE public.room_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  game_number integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  winner_user_id uuid,
  player_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_room_games_room_id ON public.room_games(room_id);
CREATE INDEX idx_room_games_started_at ON public.room_games(started_at DESC);

-- Enable RLS
ALTER TABLE public.room_games ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_games
CREATE POLICY "Participants can view room games"
ON public.room_games FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = room_games.room_id AND rp.user_id = auth.uid()
  )
);

CREATE POLICY "Host can insert room games"
ON public.room_games FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_rooms gr
    WHERE gr.id = room_games.room_id AND gr.host_user_id = auth.uid()
  )
);

CREATE POLICY "Host can update room games"
ON public.room_games FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM game_rooms gr
    WHERE gr.id = room_games.room_id AND gr.host_user_id = auth.uid()
  )
);

-- 1.2 Add new columns to room_participants
ALTER TABLE public.room_participants 
ADD COLUMN IF NOT EXISTS last_played_at timestamptz,
ADD COLUMN IF NOT EXISTS has_seen_results boolean DEFAULT true;

-- 1.3 Add columns to game_rooms for simplified status
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS is_permanent boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS current_game_id uuid REFERENCES room_games(id);

-- 1.4 Create function to auto-create room invite notifications
CREATE OR REPLACE FUNCTION public.notify_room_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record RECORD;
  sender_nickname TEXT;
BEGIN
  -- Get room details
  SELECT * INTO room_record FROM game_rooms WHERE id = NEW.room_id;
  
  -- Get sender nickname
  SELECT nickname INTO sender_nickname FROM profiles WHERE user_id = room_record.host_user_id;
  
  -- Don't create notification if user is the host
  IF NEW.user_id = room_record.host_user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for the invited user
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'room_invite',
    'Game Room Invitation',
    COALESCE(sender_nickname, 'A player') || ' invited you to play!',
    jsonb_build_object(
      'room_id', NEW.room_id,
      'room_code', room_record.room_code,
      'room_name', room_record.room_name,
      'category_name', room_record.category_name,
      'host_user_id', room_record.host_user_id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for room invite notifications
DROP TRIGGER IF EXISTS on_room_participant_added ON room_participants;
CREATE TRIGGER on_room_participant_added
  AFTER INSERT ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_room_invite();

-- 1.5 Create function to notify when game starts
CREATE OR REPLACE FUNCTION public.notify_game_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record RECORD;
  participant RECORD;
BEGIN
  -- Get room details
  SELECT * INTO room_record FROM game_rooms WHERE id = NEW.room_id;
  
  -- Notify all participants except the one who started the game
  FOR participant IN 
    SELECT rp.user_id FROM room_participants rp 
    WHERE rp.room_id = NEW.room_id AND rp.user_id != room_record.host_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      participant.user_id,
      'game_started',
      'Game Started!',
      'A game has started in ' || COALESCE(room_record.room_name, 'your room') || '!',
      jsonb_build_object(
        'room_id', NEW.room_id,
        'room_code', room_record.room_code,
        'game_id', NEW.id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for game started notifications
DROP TRIGGER IF EXISTS on_game_started ON room_games;
CREATE TRIGGER on_game_started
  AFTER INSERT ON room_games
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_started();

-- Enable realtime for room_games
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_games;