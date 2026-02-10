-- Allow admins to update any quiz post
CREATE POLICY "Admins can update any quiz post"
ON public.user_quiz_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
