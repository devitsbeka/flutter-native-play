-- Create notifications table for persistent notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'friend_request', 'friend_accepted', 'challenge', 'game_result', 'reward', 'achievement', 'system'
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- flexible data for different notification types (e.g., sender_id, room_id, etc.)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert notifications (for when creating notifications for others via triggers/functions)
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;