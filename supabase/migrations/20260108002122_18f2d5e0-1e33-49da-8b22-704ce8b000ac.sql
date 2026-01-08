-- Add cover_image column to user_quiz_posts
ALTER TABLE user_quiz_posts ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Add cover_image column to quiz_collections  
ALTER TABLE quiz_collections ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create bucket for quiz cover images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quiz-covers', 'quiz-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for authenticated users to upload
CREATE POLICY "Users can upload cover images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quiz-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy for authenticated users to update their own uploads
CREATE POLICY "Users can update their cover images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quiz-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy for authenticated users to delete their own uploads
CREATE POLICY "Users can delete their cover images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quiz-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access
CREATE POLICY "Public can view cover images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quiz-covers');