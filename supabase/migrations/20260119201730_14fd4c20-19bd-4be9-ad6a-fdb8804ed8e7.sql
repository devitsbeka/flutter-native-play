-- Add referral code column to friend_invites for shareable links
ALTER TABLE public.friend_invites 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_friend_invites_referral_code ON public.friend_invites(referral_code);

-- Add referred_by_invite_id to profiles for tracking who referred whom
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_invite_id UUID REFERENCES public.friend_invites(id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;