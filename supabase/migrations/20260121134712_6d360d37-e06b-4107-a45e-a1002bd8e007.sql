
-- Drop only the OLD permissive policies (keep the new restricted ones)

-- level_positions: drop old "Anyone can..." policies
DROP POLICY "Anyone can insert level positions" ON public.level_positions;
DROP POLICY "Anyone can update level positions" ON public.level_positions;

-- Create the proper admin-only policies for level_positions
CREATE POLICY "Admins can insert level positions" 
ON public.level_positions FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update level positions" 
ON public.level_positions FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- notifications: drop old "Authenticated users can create notifications" with true
DROP POLICY "Authenticated users can create notifications" ON public.notifications;

-- Create proper policy that still allows authenticated users
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- tv_players: drop old "Players can insert themselves" with true
DROP POLICY "Players can insert themselves" ON public.tv_players;

-- Create proper policy
CREATE POLICY "Players can insert themselves" 
ON public.tv_players FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- user_presence: drop old "Anonymous users can..." policies
DROP POLICY "Anonymous users can insert presence" ON public.user_presence;
DROP POLICY "Anonymous users can update own presence" ON public.user_presence;
DROP POLICY "Anonymous users can view own presence" ON public.user_presence;
