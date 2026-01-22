-- Add total_rounds column to persist the total number of rounds for a session
ALTER TABLE public.tv_sessions 
ADD COLUMN IF NOT EXISTS total_rounds integer DEFAULT 1;