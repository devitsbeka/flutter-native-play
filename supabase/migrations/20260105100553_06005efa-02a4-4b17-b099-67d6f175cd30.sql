-- Add last_read_at column to room_participants for tracking unread messages
ALTER TABLE public.room_participants 
ADD COLUMN last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();