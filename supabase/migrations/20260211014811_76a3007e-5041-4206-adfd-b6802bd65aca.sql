
-- Allow admins to upload avatars for any user
CREATE POLICY "Admins can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update avatars for any user
CREATE POLICY "Admins can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
