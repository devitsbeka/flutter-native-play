-- Create table for tracking daily plays
CREATE TABLE public.user_daily_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plays_used INTEGER NOT NULL DEFAULT 0,
  plays_from_ads INTEGER NOT NULL DEFAULT 0,
  play_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_ad_watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, play_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_plays ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own daily plays"
ON public.user_daily_plays FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plays"
ON public.user_daily_plays FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plays"
ON public.user_daily_plays FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_daily_plays_updated_at
BEFORE UPDATE ON public.user_daily_plays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();