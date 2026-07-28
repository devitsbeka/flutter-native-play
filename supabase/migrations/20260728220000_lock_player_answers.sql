-- Lovable security scan, CRITICAL: "Any room participant can insert answers
-- as another player." Audit item S-3.
--
-- The current INSERT policy:
--
--   WITH CHECK (
--     (auth.uid() IS NOT NULL AND auth.uid() = user_id)
--     OR (tv_session_id IS NOT NULL AND EXISTS (
--           SELECT 1 FROM tv_sessions ts WHERE ts.id = ...
--             AND ts.status IN ('playing','question','reveal')))
--     OR (room_id IS NOT NULL AND EXISTS (
--           SELECT 1 FROM room_participants rp WHERE rp.room_id = ...))
--   )
--
-- Only the first clause checks WHO is writing. The second lets ANY caller -
-- including an unauthenticated one - insert a row carrying ANY user_id, for
-- as long as some TV session is mid-question. The third is weaker still: it
-- checks that the room has participants, not that the CALLER is one. So the
-- scan's title understates it - you do not have to be a participant.
--
-- The UPDATE policy has the same shape:
--
--   USING (auth.uid() = user_id OR (tv_session_id IS NOT NULL))
--
-- - the second clause lets anyone rewrite anyone's answer, including
-- points_earned, in any TV session.
--
-- Those permissive clauses existed for ONE reason: the client used to write
-- answers directly when the submit_tv_answer RPC was unavailable, and guest
-- players have no auth.uid() to match. That fallback is gone as of the
-- companion commit - submit_tv_answer is the only writer, and being
-- SECURITY DEFINER it does not consult these policies at all. So the
-- permissions can now say what was always intended.
--
-- Verified before writing this: across the whole of src/, the only remaining
-- client statements against player_answers are SELECT and DELETE. Nothing
-- inserts or updates it outside the RPC.
--
-- Kept deliberately:
--   * SELECT - the TV and controllers read answers to render who answered.
--   * DELETE - the host clears answers between rounds/games from the client.
-- Neither is affected here.

-- INSERT: your own row, and only if you are signed in. Guests are covered by
-- the RPC, which bypasses RLS; nothing else legitimately inserts.
DROP POLICY IF EXISTS "Players can insert answers" ON public.player_answers;

CREATE POLICY "Players can insert their own answers"
ON public.player_answers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- UPDATE: same rule. The RPC's ON CONFLICT DO UPDATE is unaffected.
DROP POLICY IF EXISTS "Players can update their own answers" ON public.player_answers;

CREATE POLICY "Players can update their own answers"
ON public.player_answers
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
