-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own level progress" ON public.user_level_progress;

-- Create a new policy that allows everyone to view all level progress (for leaderboards)
CREATE POLICY "Level progress is viewable by everyone" 
ON public.user_level_progress 
FOR SELECT 
USING (true);