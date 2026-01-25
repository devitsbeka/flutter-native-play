-- ============================================
-- Fix Guest Player Registration in tv_players
-- ============================================

-- The current INSERT policy requires auth.uid() IS NOT NULL, which blocks guest players
-- We need to allow anonymous inserts where the player provides their own player_id

-- 1. Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Players can insert themselves" ON public.tv_players;

-- 2. Create new INSERT policy that allows guests to register
-- For guests: They provide a player_id and user_id is NULL
-- For authenticated: They must match auth.uid()
CREATE POLICY "Players can insert themselves" 
ON public.tv_players FOR INSERT 
WITH CHECK (
  -- Authenticated users: must match their auth.uid()
  (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  OR
  -- Guest users: auth.uid() is null, user_id must be null, player_id must be provided
  (auth.uid() IS NULL AND user_id IS NULL AND player_id IS NOT NULL)
);

-- 3. Also fix the UPDATE policy to allow guests to update their own record
DROP POLICY IF EXISTS "Players can update their own record" ON public.tv_players;

CREATE POLICY "Players can update their own record" 
ON public.tv_players FOR UPDATE 
USING (
  -- Authenticated users update their own
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Guest users update records with null user_id (they identify by player_id in WHERE clause)
  (auth.uid() IS NULL AND user_id IS NULL)
);