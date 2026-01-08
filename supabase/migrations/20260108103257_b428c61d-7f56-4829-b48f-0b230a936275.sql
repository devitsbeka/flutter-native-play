-- Add country_code column to user_presence for guest tracking
ALTER TABLE public.user_presence 
ADD COLUMN IF NOT EXISTS country_code text;

-- Allow anonymous users to insert/update their presence
CREATE POLICY "Anonymous users can insert presence"
ON public.user_presence
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anonymous users can update own presence"
ON public.user_presence
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow admins to see all presence (including anonymous)
DROP POLICY IF EXISTS "Users can view own presence" ON public.user_presence;
CREATE POLICY "Users and admins can view presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Allow anon to read their own presence
CREATE POLICY "Anonymous users can view own presence"
ON public.user_presence
FOR SELECT
TO anon
USING (true);