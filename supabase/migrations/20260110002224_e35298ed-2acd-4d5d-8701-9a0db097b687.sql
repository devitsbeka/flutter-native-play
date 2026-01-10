-- Create a secure function to update user currency with database-level locking
-- This prevents race conditions from concurrent transactions
CREATE OR REPLACE FUNCTION public.update_user_currency(
  p_user_id uuid,
  p_coins_delta integer DEFAULT 0,
  p_gems_delta integer DEFAULT 0
)
RETURNS TABLE (new_coins integer, new_gems integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_coins integer;
  v_current_gems integer;
BEGIN
  -- Lock the row for update (prevents race conditions)
  SELECT coins, gems INTO v_current_coins, v_current_gems
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if profile exists
  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;
  
  -- Prevent negative balances
  IF v_current_coins + p_coins_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  IF v_current_gems + p_gems_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient gems';
  END IF;
  
  -- Update and return new values
  UPDATE profiles
  SET 
    coins = v_current_coins + p_coins_delta,
    gems = v_current_gems + p_gems_delta,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING coins, gems INTO new_coins, new_gems;
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_currency(uuid, integer, integer) TO authenticated;