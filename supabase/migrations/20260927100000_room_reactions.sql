-- Icons sent between players during a match.
--
-- The owner's ask for the arena: while a teammate (or an opponent) is on the
-- spot, the others can send them an icon from the library — a cheer, a
-- jab — and the player sees what came in once their turn is over. Nothing
-- interrupts the spotlight: the icons are stored, and the screen reads them
-- back after the round.
--
-- Plain rows, no function: who may write is exactly who is seated in the
-- room, and the row says who it is for. Both sides read through the same
-- seat check, so a stranger sees nothing and a player sees the room's
-- traffic (the after-round strip filters to their own).

CREATE TABLE IF NOT EXISTS public.room_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id   uuid NOT NULL,
  icon         text NOT NULL CHECK (length(icon) BETWEEN 1 AND 500),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_reactions_to_idx
  ON public.room_reactions (to_user_id, room_id, created_at DESC);

ALTER TABLE public.room_reactions ENABLE ROW LEVEL SECURITY;

-- Seated in the room: the one check both policies share.
DROP POLICY IF EXISTS "Seated players read the room's reactions" ON public.room_reactions;
CREATE POLICY "Seated players read the room's reactions"
  ON public.room_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants rp
       WHERE rp.room_id = room_reactions.room_id
         AND rp.user_id = auth.uid()
         AND rp.status IN ('joined', 'ready', 'playing')
    )
  );

DROP POLICY IF EXISTS "Seated players send reactions to seated players" ON public.room_reactions;
CREATE POLICY "Seated players send reactions to seated players"
  ON public.room_reactions FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid()
    AND from_user_id <> to_user_id
    AND EXISTS (
      SELECT 1 FROM public.room_participants rp
       WHERE rp.room_id = room_reactions.room_id
         AND rp.user_id = auth.uid()
         AND rp.status IN ('joined', 'ready', 'playing')
    )
    AND EXISTS (
      SELECT 1 FROM public.room_participants rp
       WHERE rp.room_id = room_reactions.room_id
         AND rp.user_id = room_reactions.to_user_id
         AND rp.status IN ('joined', 'ready', 'playing')
    )
  );

GRANT SELECT, INSERT ON public.room_reactions TO authenticated;

-- The recipient's device learns of a new icon the moment it lands.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.room_reactions;
END $$;

ALTER TABLE public.room_reactions REPLICA IDENTITY FULL;
