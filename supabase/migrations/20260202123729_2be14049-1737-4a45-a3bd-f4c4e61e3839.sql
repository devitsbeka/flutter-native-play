-- Add is_archived column to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create partial index for active rooms (faster queries)
CREATE INDEX IF NOT EXISTS idx_game_rooms_active 
ON public.game_rooms (last_activity_at DESC) 
WHERE is_archived = FALSE;

-- Function to check and archive old rooms when queried
CREATE OR REPLACE FUNCTION public.auto_archive_stale_rooms()
RETURNS TRIGGER AS $$
BEGIN
  -- Archive rooms inactive for more than 3 hours
  UPDATE public.game_rooms
  SET is_archived = TRUE
  WHERE is_archived = FALSE
    AND last_activity_at < NOW() - INTERVAL '3 hours'
    AND is_permanent != TRUE;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;