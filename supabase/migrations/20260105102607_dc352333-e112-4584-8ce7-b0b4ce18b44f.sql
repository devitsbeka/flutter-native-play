-- Create user_league_data table for tracking league progress and rank history
CREATE TABLE public.user_league_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_tier INTEGER DEFAULT 1 CHECK (league_tier >= 1 AND league_tier <= 5),
  current_xp INTEGER DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,
  previous_rank INTEGER,
  current_rank INTEGER,
  last_visited_at TIMESTAMPTZ DEFAULT now(),
  week_start_date DATE DEFAULT date_trunc('week', now())::date,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_league_data ENABLE ROW LEVEL SECURITY;

-- Users can view all league data (for leaderboard display)
CREATE POLICY "Anyone can view league data"
ON public.user_league_data
FOR SELECT
USING (true);

-- Users can insert their own league data
CREATE POLICY "Users can insert their own league data"
ON public.user_league_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own league data
CREATE POLICY "Users can update their own league data"
ON public.user_league_data
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_league_data_updated_at
BEFORE UPDATE ON public.user_league_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for league data
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_league_data;