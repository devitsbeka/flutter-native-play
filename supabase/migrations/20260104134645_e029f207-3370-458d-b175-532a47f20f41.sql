-- Add total_score column to track cumulative points across all rounds
ALTER TABLE public.room_participants 
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0;