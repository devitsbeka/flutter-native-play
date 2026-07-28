-- Tier 1 · 1.2 (host assignment race) + 1.6 (pairing code collisions)
--
-- Claiming a TV is currently a bare UPDATE from the phone:
--
--   UPDATE tv_sessions SET host_user_id = <me>, is_paired = true,
--                          status = 'paired'
--    WHERE id = <session>;
--
-- with the session chosen by:
--
--   SELECT * FROM tv_sessions WHERE tv_pairing_code = <typed>
--     AND is_paired = false ORDER BY created_at DESC LIMIT 1;
--
-- Three things are wrong with that pair, and the live data shows all three:
--
-- 1. NOTHING CHECKS THE SESSION IS UNCLAIMED. Two phones typing the same
--    code both "succeed"; the second write silently takes the first host's
--    TV away. Last writer wins.
--
-- 2. THE CANDIDATE POOL IS EVERY UNPAIRED SESSION EVER CREATED. There is no
--    expiry or status filter, so all 900+ abandoned rows are eligible - and
--    108 distinct codes among them are already duplicated (one code is on 14
--    sessions). Only "ORDER BY created_at DESC LIMIT 1" keeps this working,
--    which means correctness rests on nobody else having created a session
--    with the same code more recently than yours. That is a coin flip, not
--    an invariant, and losing it pairs your room to a stranger's TV.
--
-- 3. Nothing requires the claimer to be signed in, though the product rule
--    is that only a logged-in user may host.
--
-- This RPC makes the claim atomic and the candidate set honest: the row is
-- locked, re-checked under the lock, and updated with a CAS on
-- host_user_id IS NULL, so exactly one caller can ever win. Expired and
-- already-claimed sessions are not candidates at all. auth.uid() supplies
-- the host id, so a client cannot claim a TV on someone else's behalf.
--
-- It deliberately does NOT touch questions/queue - the caller still writes
-- those after a successful claim, as host.

CREATE OR REPLACE FUNCTION public.tv_claim_session(
  p_pairing_code text,
  p_room_id       uuid DEFAULT NULL,
  p_room_name     text DEFAULT NULL,
  p_category_name text DEFAULT NULL,
  p_category_icon text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_session_id uuid;
  v_candidates integer := 0;
BEGIN
  -- Product rule: hosting requires an account.
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  END IF;

  IF p_pairing_code IS NULL OR btrim(p_pairing_code) = '' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_code');
  END IF;

  -- A session is claimable only while it is genuinely waiting for a host:
  -- right code, never claimed, not paired, not expired.
  SELECT count(*) INTO v_candidates
  FROM tv_sessions s
  WHERE s.tv_pairing_code = btrim(p_pairing_code)
    AND s.is_paired = false
    AND s.host_user_id IS NULL
    AND s.status = 'waiting'
    AND s.expires_at > now();

  IF v_candidates = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_found');
  END IF;

  -- Newest still wins when a code is genuinely duplicated among live
  -- sessions, but now only live ones compete, and the CAS below decides it.
  SELECT s.id INTO v_session_id
  FROM tv_sessions s
  WHERE s.tv_pairing_code = btrim(p_pairing_code)
    AND s.is_paired = false
    AND s.host_user_id IS NULL
    AND s.status = 'waiting'
    AND s.expires_at > now()
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  UPDATE tv_sessions
     SET host_user_id  = v_uid,
         is_paired     = true,
         status        = 'paired',
         room_id       = COALESCE(p_room_id,       room_id),
         room_name     = COALESCE(p_room_name,     room_name),
         category_name = COALESCE(p_category_name, category_name),
         category_icon = COALESCE(p_category_icon, category_icon)
   WHERE id = v_session_id
     AND host_user_id IS NULL      -- CAS: someone else may have won the race
     AND is_paired = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'session_id', v_session_id,
    -- >1 means the typed code was ambiguous among LIVE sessions; surfaced so
    -- the collision rate can be measured rather than assumed.
    'live_candidates', v_candidates);
END;
$$;

-- anon may call it, but it refuses without auth.uid() - keeping the refusal
-- inside the function gives a clean reason instead of a bare 403.
GRANT EXECUTE ON FUNCTION public.tv_claim_session(text, uuid, text, text, text)
  TO anon, authenticated;
