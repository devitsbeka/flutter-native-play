-- Create storage bucket for icons if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('icons', 'icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload to icons bucket
CREATE POLICY "Admins can upload to icons bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'icons' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update icons bucket
CREATE POLICY "Admins can update icons bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'icons' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete from icons bucket
CREATE POLICY "Admins can delete from icons bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'icons' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow public read access to icons bucket
CREATE POLICY "Public can read icons bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'icons');