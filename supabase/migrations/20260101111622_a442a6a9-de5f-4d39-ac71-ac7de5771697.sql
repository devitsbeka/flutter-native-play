-- Add coin and gem currency columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 10;