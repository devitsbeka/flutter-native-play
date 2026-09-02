-- ============================================================
-- A pending ask is the asker's to take back.
--
-- The Public tab enforces one game at a time: a player waiting on one
-- host must be able to withdraw that ask before knocking on another
-- door. Writes to room_join_requests otherwise stay with the two RPCs
-- (request_room_join / respond_room_join); this only lets the ASKER
-- delete their OWN row while it is still pending. A request the host
-- already answered keeps its answer — an approval is a standing yes
-- that request_room_join turns into a seat, and a decline stays a
-- decline.
-- ============================================================

DROP POLICY IF EXISTS "Askers withdraw their own pending requests"
  ON public.room_join_requests;
CREATE POLICY "Askers withdraw their own pending requests"
  ON public.room_join_requests
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');
