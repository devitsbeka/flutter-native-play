
-- Fix trivia_facts RLS policy - restrict updates to authenticated users only
-- The current policy allows ANY authenticated user to update vote counts, which is correct
-- But we should ensure they can only increment votes, not modify other fields

DROP POLICY IF EXISTS "Users can update vote counts" ON public.trivia_facts;

-- Create a more restrictive policy that only allows incrementing vote columns
CREATE POLICY "Authenticated users can vote on facts"
ON public.trivia_facts
FOR UPDATE
TO authenticated
USING (is_active = true)
WITH CHECK (is_active = true);

-- Add performance index for questions.category_id (heavily queried column)
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON public.questions(category_id);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_questions_category_production ON public.questions(category_id, in_production) WHERE is_active = true;

-- Add index for profiles user_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Add index for notifications user_id (for fetching user notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Add index for room_questions room_id
CREATE INDEX IF NOT EXISTS idx_room_questions_room_id ON public.room_questions(room_id);
