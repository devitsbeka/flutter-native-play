-- Create room_chat_messages table for lobby chat
CREATE TABLE public.room_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nickname text NOT NULL,
  avatar_url text,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Participants can view room messages"
ON public.room_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = room_chat_messages.room_id AND rp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.room_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM room_participants rp
    WHERE rp.room_id = room_chat_messages.room_id AND rp.user_id = auth.uid()
  )
);

-- Enable realtime for room chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_chat_messages;

-- Update trigger to mark room activity on new chat message
CREATE TRIGGER on_room_chat_message
AFTER INSERT ON public.room_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_room_activity();