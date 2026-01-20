-- Create room_category_queue table for scheduling categories
CREATE TABLE public.room_category_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('category', 'random', 'user_trivia')),
  category_id TEXT,
  category_name TEXT,
  user_trivia_id UUID,
  icon_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_room_category_queue_room_id ON public.room_category_queue(room_id);
CREATE INDEX idx_room_category_queue_position ON public.room_category_queue(room_id, position);

-- Enable RLS
ALTER TABLE public.room_category_queue ENABLE ROW LEVEL SECURITY;

-- Allow room participants to read queue
CREATE POLICY "Participants can view queue" ON public.room_category_queue
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_participants WHERE user_id = auth.uid()
    )
  );

-- Only host can insert to queue
CREATE POLICY "Host can insert queue" ON public.room_category_queue
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT id FROM game_rooms WHERE host_user_id = auth.uid()
    )
  );

-- Only host can update queue
CREATE POLICY "Host can update queue" ON public.room_category_queue
  FOR UPDATE USING (
    room_id IN (
      SELECT id FROM game_rooms WHERE host_user_id = auth.uid()
    )
  );

-- Only host can delete from queue
CREATE POLICY "Host can delete queue" ON public.room_category_queue
  FOR DELETE USING (
    room_id IN (
      SELECT id FROM game_rooms WHERE host_user_id = auth.uid()
    )
  );

-- Enable realtime for the queue table
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_category_queue;