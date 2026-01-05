-- Add UPDATE and DELETE policies for icon-library storage bucket
CREATE POLICY "Admins can update icon library files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'icon-library' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete icon library files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'icon-library' AND has_role(auth.uid(), 'admin'::app_role));