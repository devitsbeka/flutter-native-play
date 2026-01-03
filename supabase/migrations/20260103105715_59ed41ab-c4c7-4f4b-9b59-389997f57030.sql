-- Create table for storing weekly leaderboard snapshots
CREATE TABLE public.weekly_leaderboard_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  country_code TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(week_number, year, user_id)
);

-- Create index for efficient querying by week/year
CREATE INDEX idx_weekly_leaderboard_week_year ON public.weekly_leaderboard_snapshots(week_number, year);
CREATE INDEX idx_weekly_leaderboard_rank ON public.weekly_leaderboard_snapshots(week_number, year, rank);

-- Enable RLS
ALTER TABLE public.weekly_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can view historical leaderboards
CREATE POLICY "Weekly leaderboard snapshots are viewable by everyone"
ON public.weekly_leaderboard_snapshots
FOR SELECT
USING (true);

-- Only admins can insert/update/delete snapshots (will be done via cron or admin action)
CREATE POLICY "Admins can manage weekly leaderboard snapshots"
ON public.weekly_leaderboard_snapshots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));