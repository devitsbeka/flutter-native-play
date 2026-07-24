-- Atomic power-up quantity adjustment for the authenticated user.
-- Replaces the client-side read-modify-write (stale-cache absolute writes raced
-- and could clobber concurrent grants/uses). Delta-based and clamped at 0.
CREATE OR REPLACE FUNCTION public.adjust_power_up(p_type text, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_type, quantity)
  VALUES (v_user_id, p_type, GREATEST(0, p_delta))
  ON CONFLICT (user_id, power_up_type)
  DO UPDATE SET quantity = GREATEST(0, user_power_ups.quantity + p_delta)
  RETURNING quantity INTO v_quantity;

  RETURN v_quantity;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_power_up(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_power_up(text, integer) TO authenticated;
