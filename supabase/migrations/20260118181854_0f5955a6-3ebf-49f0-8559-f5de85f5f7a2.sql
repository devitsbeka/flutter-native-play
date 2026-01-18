-- Add friend invite tracking to vip_subscriptions
ALTER TABLE vip_subscriptions 
ADD COLUMN IF NOT EXISTS vip_tier TEXT DEFAULT 'pro',
ADD COLUMN IF NOT EXISTS friend_invites_remaining INTEGER DEFAULT 0;

-- Create friend_invites table
CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id UUID,
  status TEXT DEFAULT 'pending',
  tier_granted TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for friend_invites
CREATE POLICY "Users can view their sent invites"
ON public.friend_invites
FOR SELECT
USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invites sent to them"
ON public.friend_invites
FOR SELECT
USING (invited_user_id = auth.uid());

CREATE POLICY "PRO users can create invites"
ON public.friend_invites
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their own invites"
ON public.friend_invites
FOR UPDATE
USING (auth.uid() = inviter_id OR auth.uid() = invited_user_id);