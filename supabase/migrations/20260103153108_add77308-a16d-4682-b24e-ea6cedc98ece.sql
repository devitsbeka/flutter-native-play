-- Add animated_avatar_url column to avatar_generations table
-- This allows each generated avatar to store its own animation
ALTER TABLE public.avatar_generations 
ADD COLUMN IF NOT EXISTS animated_avatar_url text;