-- Add category and game info to tv_sessions for realtime sync
ALTER TABLE public.tv_sessions 
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS category_icon TEXT,
ADD COLUMN IF NOT EXISTS game_name TEXT DEFAULT 'TV კვიზი';