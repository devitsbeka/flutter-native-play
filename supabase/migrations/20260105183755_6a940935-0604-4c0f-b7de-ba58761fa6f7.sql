-- Create table to store icon verification results
CREATE TABLE public.icon_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  icon_url TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast filtering of broken icons
CREATE INDEX idx_icon_verification_is_valid ON public.icon_verification_results(is_valid);
CREATE INDEX idx_icon_verification_slug ON public.icon_verification_results(slug);

-- Enable RLS
ALTER TABLE public.icon_verification_results ENABLE ROW LEVEL SECURITY;

-- Allow public read access (admin page needs this)
CREATE POLICY "Anyone can view icon verification results"
ON public.icon_verification_results
FOR SELECT
USING (true);

-- Allow insert/update from service role (edge function)
CREATE POLICY "Service role can manage verification results"
ON public.icon_verification_results
FOR ALL
USING (true)
WITH CHECK (true);