-- Create table for user avatar frames (unlocked through gem shop)
CREATE TABLE public.user_avatar_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  frame_id text NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  is_equipped boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, frame_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_avatar_frames ENABLE ROW LEVEL SECURITY;

-- RLS Policies for avatar frames
CREATE POLICY "Users can view their own frames"
  ON public.user_avatar_frames FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own frames"
  ON public.user_avatar_frames FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own frames"
  ON public.user_avatar_frames FOR UPDATE
  USING (auth.uid() = user_id);

-- Create table for VIP subscriptions
CREATE TABLE public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  vip_tier text NOT NULL DEFAULT 'standard',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  auto_renew boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for VIP subscriptions
CREATE POLICY "Users can view their own VIP subscription"
  ON public.vip_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own VIP subscription"
  ON public.vip_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VIP subscription"
  ON public.vip_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at on vip_subscriptions
CREATE TRIGGER update_vip_subscriptions_updated_at
  BEFORE UPDATE ON public.vip_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();