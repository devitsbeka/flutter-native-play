-- Add is_public field to user_quiz_posts for private/public toggle
ALTER TABLE public.user_quiz_posts 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Update RLS policy to allow viewing only public posts or own posts
DROP POLICY IF EXISTS "Anyone can view quiz posts" ON public.user_quiz_posts;

CREATE POLICY "Users can view public posts or own posts" 
ON public.user_quiz_posts 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);