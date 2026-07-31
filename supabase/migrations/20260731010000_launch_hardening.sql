-- Launch hardening. Three unrelated problems, all found by probing the live
-- REST API with nothing but the anon key that ships in the client bundle.

-- ---------------------------------------------------------------------------
-- 1. The payment ledger was world-readable AND world-writable.
--
--   GET /rest/v1/gem_purchases  (unauthenticated) -> 21 rows, each with
--   user_id, product_id, amount_gel, payment_provider and status.
--
-- The own-row policy on this table is correct. The problem is the one sitting
-- next to it:
--
--   CREATE POLICY "Service role can manage gem purchases"
--   ON public.gem_purchases FOR ALL USING (true) WITH CHECK (true);
--
-- Policies are permissive and OR'd together, and this one names no role, so
-- it applies to anon as much as anyone - FOR ALL, so INSERT/UPDATE/DELETE too.
-- Someone could write themselves a completed purchase.
--
-- It was never needed. service_role BYPASSES row level security entirely, so
-- the edge functions this was meant to enable were never relying on it. The
-- policy did nothing except hold the door open. Same shape as the purchase
-- visibility bug fixed in 20260728210000; this is a second instance of it.
DROP POLICY IF EXISTS "Service role can manage gem purchases" ON public.gem_purchases;


-- ---------------------------------------------------------------------------
-- 2. Referral codes were still readable - through a different table.
--
-- 20260731000000 revoked profiles.referral_code, which would have looked like
-- a complete fix. It was not:
--
--   CREATE POLICY "Anyone can lookup invite by referral code"
--   ON friend_invites FOR SELECT USING (referral_code IS NOT NULL);
--
-- That is not a lookup. The predicate does not compare the code to anything -
-- it grants read on every row that HAS a code, and the code is a column of
-- the row. So the whole invite table was listable, referral codes and
-- invited_email included.
--
-- Nothing in the client needs it. Auth.tsx resolves a code through
-- resolve_referral_code(); every other read filters on inviter_id, which the
-- "Users can view their sent invites" policy already covers.
DROP POLICY IF EXISTS "Anyone can lookup invite by referral code" ON public.friend_invites;


-- ---------------------------------------------------------------------------
-- 3. Zombie TV sessions: 1170 of 1171 rows are past expires_at.
--
-- They matter because joining is a lookup by pairing code with no expiry
-- filter (nine call sites do `.eq('tv_pairing_code', code)`), and the code
-- space is four digits. Every dead session left holding a code is another
-- chance for a player to be dropped into a game that ended weeks ago, and
-- another way for a fresh session to collide with a stale one.
--
-- Deliberately conservative: this RETIRES codes rather than deleting rows.
-- game_rooms, player_answers, tv_players and tv_round_history all reference
-- tv_session_id, and a bulk delete right before launch is a worse trade than
-- leaving dead rows in place. Clearing the code is what actually stops the
-- collision and the accidental join.
CREATE OR REPLACE FUNCTION public.retire_expired_tv_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE tv_sessions
     SET tv_pairing_code = NULL,
         pairing_code = NULL,
         is_paired = false
   WHERE expires_at < now()
     AND (tv_pairing_code IS NOT NULL OR pairing_code IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.retire_expired_tv_sessions() FROM anon, authenticated;

-- Run it once now for the backlog.
SELECT public.retire_expired_tv_sessions();

-- And keep it from building up again. A session that has expired cannot hold
-- a code, enforced at write time rather than depending on a sweep running.
CREATE OR REPLACE FUNCTION public.clear_code_on_expired_tv_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at < now() THEN
    NEW.tv_pairing_code := NULL;
    NEW.pairing_code := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tv_sessions_clear_expired_code ON public.tv_sessions;
CREATE TRIGGER tv_sessions_clear_expired_code
  BEFORE UPDATE ON public.tv_sessions
  FOR EACH ROW EXECUTE FUNCTION public.clear_code_on_expired_tv_session();


-- ---------------------------------------------------------------------------
-- 4. Notifications created before the sender_nickname fix still render
-- "ვიღაცა" (someone). The name was never stored, so the UI has nothing to
-- show. Backfill it from the sender id already in the payload.
--
-- Two key names carry the sender, because the notification types were
-- written at different times: likes and saves use sender_id, played-your-
-- trivia uses player_id. Both are handled, and the uuid pattern guard keeps
-- a malformed value from failing the cast and taking the migration with it.
UPDATE public.notifications n
   SET data = n.data || jsonb_build_object('sender_nickname', p.nickname)
  FROM public.profiles p
 WHERE NOT (n.data ? 'sender_nickname')
   AND COALESCE(n.data->>'sender_id', n.data->>'player_id')
       ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND p.user_id = COALESCE(n.data->>'sender_id', n.data->>'player_id')::uuid
   AND p.nickname IS NOT NULL;
