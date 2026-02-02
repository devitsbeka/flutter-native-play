-- New table for daily VIP rewards tracking
CREATE TABLE public.user_daily_vip_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  powers_claimed BOOLEAN DEFAULT FALSE,
  spins_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_vip_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rewards
CREATE POLICY "Users can view own vip rewards"
  ON public.user_daily_vip_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vip rewards"
  ON public.user_daily_vip_rewards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vip rewards"
  ON public.user_daily_vip_rewards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());