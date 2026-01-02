-- Create table to track icon fix history
CREATE TABLE public.icon_fix_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon_slug TEXT NOT NULL UNIQUE,
  old_url TEXT,
  new_url TEXT NOT NULL,
  fixed_by UUID REFERENCES auth.users(id),
  fixed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.icon_fix_history ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view icon fix history" 
ON public.icon_fix_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert icon fix history" 
ON public.icon_fix_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete icon fix history" 
ON public.icon_fix_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));