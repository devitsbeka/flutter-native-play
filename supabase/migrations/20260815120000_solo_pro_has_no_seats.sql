-- Solo PRO is PRO for one person. Friends PRO is the one that shares.
--
-- 20260815090000 gave the solo tier a single seat, on the strength of the
-- card copy at the time ("PRO features + 1 friend"). The product rule is that
-- solo is exactly what its name says — one subscription, one player — and the
-- five seats are what Friends PRO is for and what its price buys.
--
-- A one-seat allowance also made the seats card read as pointless on the tier
-- most people are on: "0 of 1 seats used", a whole section for a single
-- invitation.
--
-- Seats already granted by a solo subscriber are left alone. Taking PRO back
-- off someone's friend to correct a tier definition is not a fix anybody
-- would thank us for; the allowance simply stops issuing new ones, and those
-- seats expire with the subscription that paid for them like any other.

CREATE OR REPLACE FUNCTION public.pro_seat_allowance(
  p_tier text,
  p_expires_at timestamptz,
  p_platform text
) RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_expires_at IS NULL OR p_expires_at <= now() THEN 0
    -- A seat confers tier 'pro'. Reading the tier alone would hand every
    -- seat holder an allowance of their own and turn one purchase into an
    -- unbounded chain of PRO; the platform is what separates a seat from a
    -- sale.
    WHEN p_platform = 'seat' THEN 0
    WHEN p_tier IN ('pro_plus', 'pro_master') THEN 5
    ELSE 0
  END;
$$;
