ALTER TABLE public.profiles 
ADD COLUMN last_play_regen_at timestamptz DEFAULT NULL;