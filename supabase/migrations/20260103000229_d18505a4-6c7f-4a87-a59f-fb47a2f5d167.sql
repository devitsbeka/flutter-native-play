-- Create user_daily_rewards table to track daily reward and chest claims with timers
CREATE TABLE public.user_daily_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_claimed boolean DEFAULT false,
  daily_claimed_at timestamp with time zone,
  chest_claimed boolean DEFAULT false,
  chest_claimed_at timestamp with time zone,
  streak_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily rewards"
ON public.user_daily_rewards
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily rewards"
ON public.user_daily_rewards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily rewards"
ON public.user_daily_rewards
FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_daily_rewards_updated_at
BEFORE UPDATE ON public.user_daily_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for user_missions to track progress live
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_missions;