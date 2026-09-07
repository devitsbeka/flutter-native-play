-- A new public room asks before letting strangers in.
--
-- 20260930100000 made `requires_approval` default to FALSE: every published
-- room was a door you had to knock on, hosts mostly wanted anybody, and open
-- was the friendlier default. The owner's call now is the other way round —
-- a room is created Public with Joining set to "Ask me", and a host who wants
-- to let anyone walk in turns it off.
--
-- The column default is the whole change, because nothing on the client sets
-- this field when it creates a room: every create path — the chooser, the
-- lounges, Words — inserts without it and takes whatever the column says.
-- Setting it here covers all of them at once, and cannot be missed by a new
-- path added later.
--
-- Rooms that already exist are LEFT ALONE. Their hosts either chose the
-- setting or have been running an open room on the old default, and a
-- migration that quietly starts holding their arrivals for approval would
-- strand the people knocking on a host who never asked to be a doorman.
--
-- Nothing about permission changes: request_room_join still decides who gets
-- in, and it reads this column exactly as it did before.

ALTER TABLE public.game_rooms
  ALTER COLUMN requires_approval SET DEFAULT true;

COMMENT ON COLUMN public.game_rooms.requires_approval IS
  'Public rooms only: when true, joining goes through room_join_requests and the host approves. Default true since 20261014100000 (owner''s ask: a new room asks). A private room ignores it — its code is the permission.';
