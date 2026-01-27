-- Create storage bucket for question media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for admin access
CREATE POLICY "Admins can upload media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'question-media' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update media" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'question-media' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete media" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'question-media' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view question media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'question-media');