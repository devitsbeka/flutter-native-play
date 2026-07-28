-- Lovable security scan, CRITICAL: "All authenticated users can read every
-- purchase transaction."
--
-- Confirmed. The policy is:
--
--   CREATE POLICY "Users can view their own transactions"
--   ON public.purchase_transactions FOR SELECT
--   USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);
--                                ^^^^^^^^^^^^^^^^^^^^^^^^
--
-- The second clause makes the first redundant: it is true for EVERY signed-in
-- user, so the policy reads "any logged-in user may read every row" despite
-- being named "their own". Exposed per row: user_id, product_id,
-- amount_paid, currency_used, platform and the full value_received payload -
-- i.e. who bought what, for how much, and when.
--
-- purchase_transactions is also in the supabase_realtime publication, so this
-- is not merely a historical dump: a signed-in client could subscribe and
-- watch other people's purchases arrive live.
--
-- The fix is the policy the name always promised.

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.purchase_transactions;

CREATE POLICY "Users can view their own transactions"
ON public.purchase_transactions FOR SELECT
USING (auth.uid() = user_id);

-- The INSERT policy was already correct (WITH CHECK auth.uid() = user_id);
-- left alone deliberately. There is no UPDATE or DELETE policy, so neither is
-- possible from a client - also correct for a purchase ledger.


-- ---------------------------------------------------------------------------
-- Lovable security scan, WARNING: "Public Can Execute SECURITY DEFINER
-- Function" - partly this, the mutable search_path half of it.
--
-- A SECURITY DEFINER function runs as its owner. Without a pinned
-- search_path, whoever calls it controls which schema its unqualified names
-- resolve to, so a caller who can create objects in a schema earlier on the
-- path can have the function execute their code with the owner's rights.
--
-- Every function this repo has added pins search_path already; these two
-- predate that habit and were missed. Bodies are unchanged - the only
-- difference is the SET.
-- ---------------------------------------------------------------------------

-- Bodies below are copied VERBATIM from the migrations that defined them
-- (20260106225513 and 20260108163117). The only change is the added
-- `SET search_path = public`. Do not "tidy" them here - the counters they
-- maintain are live.

CREATE OR REPLACE FUNCTION public.update_quiz_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_quiz_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_quiz_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_quiz_saves_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_quiz_posts
    SET saves_count = saves_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_quiz_posts
    SET saves_count = GREATEST(0, saves_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
