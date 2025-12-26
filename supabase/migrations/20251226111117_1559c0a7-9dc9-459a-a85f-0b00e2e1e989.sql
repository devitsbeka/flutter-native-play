-- Chat messages table for real-time friend messaging
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages (insert where they are sender)
CREATE POLICY "Users can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read (only receiver can update read_at)
CREATE POLICY "Users can mark messages as read"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create index for faster message lookups
CREATE INDEX idx_chat_messages_participants ON public.chat_messages (sender_id, receiver_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages (created_at DESC);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;