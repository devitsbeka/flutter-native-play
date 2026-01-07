-- Weekly Leaderboard Rewards System
-- Tracks weekly payouts and exclusive rewards for top category players

-- Table to track weekly leaderboard snapshots and payouts
CREATE TABLE public.category_weekly_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  final_rank INTEGER NOT NULL,
  total_stars INTEGER NOT NULL DEFAULT 0,
  coins_rewarded INTEGER NOT NULL DEFAULT 0,
  gems_rewarded INTEGER NOT NULL DEFAULT 0,
  frame_rewarded TEXT, -- frame_id if they earned an exclusive frame
  badge_rewarded TEXT, -- badge_id if they earned a badge
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one entry per user per category per week
  UNIQUE(category_id, user_id, week_start_date)
);

-- Table for exclusive leaderboard frames (can't be bought, only earned)
CREATE TABLE public.leaderboard_exclusive_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frame_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  gradient TEXT NOT NULL,
  border_style TEXT NOT NULL,
  animation_class TEXT,
  rank_requirement INTEGER NOT NULL, -- 1, 2, or 3
  rarity TEXT NOT NULL DEFAULT 'legendary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert exclusive frames for top 3
INSERT INTO public.leaderboard_exclusive_frames (frame_id, name, description, gradient, border_style, animation_class, rank_requirement, rarity) VALUES
('champion_gold', 'ჩემპიონის ოქრო', '1 ადგილი - ექსკლუზიური ოქროს ჩარჩო', 'from-yellow-300 via-amber-400 to-yellow-500', 'border-4 border-yellow-400', 'animate-pulse', 1, 'legendary'),
('champion_silver', 'ჩემპიონის ვერცხლი', '2 ადგილი - ექსკლუზიური ვერცხლის ჩარჩო', 'from-slate-200 via-gray-300 to-slate-400', 'border-4 border-slate-400', 'animate-pulse', 2, 'epic'),
('champion_bronze', 'ჩემპიონის ბრინჯაო', '3 ადგილი - ექსკლუზიური ბრინჯაოს ჩარჩო', 'from-orange-300 via-amber-400 to-orange-500', 'border-4 border-orange-400', NULL, 3, 'rare');

-- Table for leaderboard badges
CREATE TABLE public.leaderboard_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  rank_requirement INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert badges for top 3
INSERT INTO public.leaderboard_badges (badge_id, name, description, icon, color, rank_requirement) VALUES
('weekly_champion', 'კვირის ჩემპიონი', 'კვირის 1 ადგილი კატეგორიაში', '👑', 'amber', 1),
('weekly_silver', 'ვერცხლის მედალი', 'კვირის 2 ადგილი კატეგორიაში', '🥈', 'slate', 2),
('weekly_bronze', 'ბრინჯაოს მედალი', 'კვირის 3 ადგილი კატეგორიაში', '🥉', 'orange', 3);

-- User's earned exclusive frames from leaderboards
CREATE TABLE public.user_leaderboard_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  frame_id TEXT NOT NULL REFERENCES public.leaderboard_exclusive_frames(frame_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_earned DATE NOT NULL,
  is_equipped BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One frame type per category per user
  UNIQUE(user_id, frame_id, category_id)
);

-- User's earned badges from leaderboards
CREATE TABLE public.user_leaderboard_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.leaderboard_badges(badge_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_name TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_earned DATE NOT NULL,
  times_earned INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Track total times earned per category
  UNIQUE(user_id, badge_id, category_id)
);

-- Enable RLS
ALTER TABLE public.category_weekly_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_exclusive_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leaderboard_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leaderboard_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_weekly_rewards
CREATE POLICY "Users can view their own weekly rewards"
  ON public.category_weekly_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can claim their own rewards"
  ON public.category_weekly_rewards FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS for leaderboard_exclusive_frames (public read)
CREATE POLICY "Anyone can view exclusive frames"
  ON public.leaderboard_exclusive_frames FOR SELECT
  USING (true);

-- RLS for leaderboard_badges (public read)
CREATE POLICY "Anyone can view badges"
  ON public.leaderboard_badges FOR SELECT
  USING (true);

-- RLS for user_leaderboard_frames
CREATE POLICY "Users can view all leaderboard frames"
  ON public.user_leaderboard_frames FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own leaderboard frames"
  ON public.user_leaderboard_frames FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert leaderboard frames"
  ON public.user_leaderboard_frames FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS for user_leaderboard_badges
CREATE POLICY "Users can view all leaderboard badges"
  ON public.user_leaderboard_badges FOR SELECT
  USING (true);

CREATE POLICY "System can insert leaderboard badges"
  ON public.user_leaderboard_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update badge counts"
  ON public.user_leaderboard_badges FOR UPDATE
  USING (auth.uid() = user_id);