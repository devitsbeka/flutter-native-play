-- Who is actually able to receive a seat.
--
-- The panel lists every accepted friend and puts a Send PRO button on each
-- row. `grant_pro_seat` then refuses the ones who already hold PRO —
-- correctly, since a seat must never overwrite a subscription somebody is
-- paying for — so the button on those rows does nothing but raise
-- `pro_seat_holder_has_pro` (owner: "i click send pro and nothing happens
-- because they already have it").
--
-- The client cannot filter them out on its own: RLS on `vip_subscriptions`
-- is `auth.uid() = user_id`, so a signed-in player can read their own row and
-- nobody else's. That is the right policy and this does not widen it. The
-- function below answers one question, for the caller's own accepted friends
-- only, and answers it by omission: it returns the friends a seat CAN be
-- given to. Who has PRO is never returned, listed, or countable from it
-- beyond "not in this list", and a stranger's id put in front of it gets
-- nothing because the caller's friendships are the only rows it reads.
--
-- The rule itself is not restated here. `pro_seat_holder_has_pro` is the same
-- function `grant_pro_seat` refuses with, so the list and the refusal cannot
-- drift apart — which is the whole point of doing this in the database rather
-- than guessing at tiers in the app.

CREATE OR REPLACE FUNCTION public.pro_seat_candidates()
RETURNS TABLE (candidate_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- candidate_id, not user_id: a RETURNS TABLE column named after a column of
  -- a table in the body makes every unqualified mention of it ambiguous, and
  -- CREATE FUNCTION accepts that happily — it fails with 42702 at the first
  -- call instead. (AGENTS.md rule 3 has the last one of these.)
  SELECT DISTINCT friends.friend_id
  FROM (
    -- A friendship is one row, and either side may have sent it.
    SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END
             AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND auth.uid() IN (f.user_id, f.friend_id)
  ) friends
  LEFT JOIN public.vip_subscriptions v ON v.user_id = friends.friend_id
  WHERE auth.uid() IS NOT NULL
    AND friends.friend_id <> auth.uid()
    AND NOT public.pro_seat_holder_has_pro(
          v.vip_tier, v.expires_at, v.purchase_platform);
$$;

COMMENT ON FUNCTION public.pro_seat_candidates() IS
  'The caller''s accepted friends who do not already hold PRO, i.e. the ones grant_pro_seat would accept. Reads no row the caller is not party to.';

-- A new SECURITY DEFINER function is executable by PUBLIC by default.
-- (AGENTS.md rule 3.) Signed-in callers only — it reads auth.uid() and
-- returns nothing without one, but anon has no business asking.
REVOKE ALL ON FUNCTION public.pro_seat_candidates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pro_seat_candidates() TO authenticated;
