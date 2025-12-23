-- Create user_rewards table to track all reward claims
CREATE TABLE public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_type TEXT NOT NULL, -- 'spin', 'chest', 'mission', 'level_up', 'streak_bonus'
  reward_value JSONB NOT NULL DEFAULT '{}',
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rewards"
ON public.user_rewards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards"
ON public.user_rewards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create user_missions table for daily missions
CREATE TABLE public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id TEXT NOT NULL,
  mission_title TEXT NOT NULL,
  mission_description TEXT,
  target_value INTEGER NOT NULL DEFAULT 1,
  current_progress INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, mission_date)
);

-- Enable RLS
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own missions"
ON public.user_missions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own missions"
ON public.user_missions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own missions"
ON public.user_missions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_daily_spins table to track spin allowance
CREATE TABLE public.user_daily_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spins_used INTEGER NOT NULL DEFAULT 0,
  max_spins INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_spins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily spins"
ON public.user_daily_spins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily spins"
ON public.user_daily_spins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily spins"
ON public.user_daily_spins
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_missions_updated_at
BEFORE UPDATE ON public.user_missions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_daily_spins_updated_at
BEFORE UPDATE ON public.user_daily_spins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();