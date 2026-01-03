-- Add room_name, last_activity_at, and has_unread_activity columns to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN room_name text,
ADD COLUMN last_activity_at timestamp with time zone DEFAULT now(),
ADD COLUMN has_unread_activity boolean DEFAULT false;

-- Create function to update last_activity_at on room changes
CREATE OR REPLACE FUNCTION public.update_room_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.game_rooms 
  SET last_activity_at = now(),
      has_unread_activity = true
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for room_participants changes (join/leave)
CREATE TRIGGER on_participant_change
AFTER INSERT OR DELETE ON public.room_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_room_activity();

-- Allow participants to update has_unread_activity (to clear it when they view)
CREATE POLICY "Participants can clear unread activity"
ON public.game_rooms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = game_rooms.id AND rp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = game_rooms.id AND rp.user_id = auth.uid()
  )
);