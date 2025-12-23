-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert level positions" ON public.level_positions;
DROP POLICY IF EXISTS "Authenticated users can update level positions" ON public.level_positions;

-- Allow anyone to insert level positions (admin config data)
CREATE POLICY "Anyone can insert level positions"
ON public.level_positions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update level positions (admin config data)
CREATE POLICY "Anyone can update level positions"
ON public.level_positions
FOR UPDATE
USING (true);