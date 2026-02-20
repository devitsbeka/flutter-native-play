
-- 1. Create process_referral_reward function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_invite_id UUID,
  p_new_user_id UUID
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_inviter_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get inviter and mark invite as accepted atomically
  SELECT inviter_id INTO v_inviter_id
  FROM friend_invites WHERE id = p_invite_id AND status = 'pending';
  
  IF v_inviter_id IS NULL THEN RETURN; END IF;
  
  -- Update invite status
  UPDATE friend_invites 
  SET status = 'accepted', 
      invited_user_id = p_new_user_id, 
      accepted_at = now()
  WHERE id = p_invite_id;

  -- Update profile with referral info
  UPDATE profiles 
  SET referred_by_invite_id = p_invite_id 
  WHERE user_id = p_new_user_id;
  
  v_expires_at := now() + interval '10 days';
  
  -- Grant PRO to new user
  INSERT INTO vip_subscriptions (user_id, vip_tier, expires_at)
  VALUES (p_new_user_id, 'standard', v_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET expires_at = GREATEST(vip_subscriptions.expires_at, v_expires_at),
      updated_at = now();
  
  -- Grant PRO to inviter
  INSERT INTO vip_subscriptions (user_id, vip_tier, expires_at)
  VALUES (v_inviter_id, 'standard', v_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET expires_at = GREATEST(vip_subscriptions.expires_at, v_expires_at),
      updated_at = now();
END;
$$;

-- 2. Drop the PRO-only INSERT policy and replace with any authenticated user
DROP POLICY IF EXISTS "PRO users can create invites" ON friend_invites;
CREATE POLICY "Any user can create invites"
  ON friend_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- 3. Add SELECT policy for looking up invites by referral_code (needed during signup)
CREATE POLICY "Anyone can lookup invite by referral code"
  ON friend_invites FOR SELECT
  USING (referral_code IS NOT NULL);
