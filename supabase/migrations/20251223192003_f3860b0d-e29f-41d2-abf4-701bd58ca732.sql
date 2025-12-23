-- Create level_positions table for storing admin-configured level positions
CREATE TABLE public.level_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id integer UNIQUE NOT NULL,
  x decimal NOT NULL,
  y decimal NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.level_positions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read level positions (public data for all users)
CREATE POLICY "Level positions are viewable by everyone"
ON public.level_positions
FOR SELECT
USING (true);

-- Only authenticated users can insert/update (you can restrict further to admins later)
CREATE POLICY "Authenticated users can insert level positions"
ON public.level_positions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update level positions"
ON public.level_positions
FOR UPDATE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_level_positions_updated_at
BEFORE UPDATE ON public.level_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();