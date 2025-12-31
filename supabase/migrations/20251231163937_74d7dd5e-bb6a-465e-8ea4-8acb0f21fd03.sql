-- Create icon_library table for storing icon metadata
CREATE TABLE public.icon_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  volume INTEGER DEFAULT 1,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_icon_library_tags ON public.icon_library USING GIN (tags);
CREATE INDEX idx_icon_library_category ON public.icon_library (category);
CREATE INDEX idx_icon_library_slug ON public.icon_library (slug);

-- Enable RLS
ALTER TABLE public.icon_library ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read icons (public data)
CREATE POLICY "Anyone can view icons"
ON public.icon_library
FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert icons"
ON public.icon_library
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update icons"
ON public.icon_library
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete icons"
ON public.icon_library
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create icon-library storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('icon-library', 'icon-library', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for icon-library bucket
CREATE POLICY "Icon library is publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'icon-library');

CREATE POLICY "Admins can upload to icon library"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'icon-library' AND has_role(auth.uid(), 'admin'::app_role));