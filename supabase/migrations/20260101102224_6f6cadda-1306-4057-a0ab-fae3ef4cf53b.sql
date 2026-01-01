-- Create category_leaderboard table to track user scores per category
CREATE TABLE public.category_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE public.category_leaderboard ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard
CREATE POLICY "Leaderboard is viewable by everyone" 
ON public.category_leaderboard 
FOR SELECT 
USING (true);

-- Users can insert their own leaderboard entries
CREATE POLICY "Users can insert their own leaderboard entries" 
ON public.category_leaderboard 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own leaderboard entries
CREATE POLICY "Users can update their own leaderboard entries" 
ON public.category_leaderboard 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_category_leaderboard_updated_at
BEFORE UPDATE ON public.category_leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();