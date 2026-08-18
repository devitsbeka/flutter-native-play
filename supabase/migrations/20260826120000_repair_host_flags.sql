-- Data repair for the host-transfer bug (fixed in 20260824120000).
--
-- Until transfer_room_host existed, a departing host's client moved
-- game_rooms.host_user_id (allowed) but its write of the NEW host's
-- is_host flag was silently dropped by RLS. Every room whose host left
-- carries the scar: host_user_id names one player while the participant
-- rows' is_host flags still describe the old world — no crown for the
-- real host, the room missing from their "my parties", and confusing
-- refusals (e.g. deleting a room the UI implies you own).
--
-- One statement makes the flags agree with the column that was always
-- written correctly. transfer_room_host keeps them in sync from now on.
UPDATE public.room_participants rp
SET is_host = (rp.user_id = gr.host_user_id)
FROM public.game_rooms gr
WHERE rp.room_id = gr.id
  AND rp.is_host IS DISTINCT FROM (rp.user_id = gr.host_user_id);
