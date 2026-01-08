-- Add cover_image column to game_rooms
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create storage bucket for room covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-covers', 'room-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public access to room covers
CREATE POLICY "Room covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-covers');

-- Create policy for authenticated users to upload room covers
CREATE POLICY "Authenticated users can upload room covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'room-covers' AND auth.role() = 'authenticated');

-- Create policy for service role to manage room covers (for edge functions)
CREATE POLICY "Service role can manage room covers"
ON storage.objects FOR ALL
USING (bucket_id = 'room-covers')
WITH CHECK (bucket_id = 'room-covers');