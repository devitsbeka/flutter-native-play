-- Create knowledge_sources table for storing URL references for AI generation
CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  favicon_url TEXT,
  content_summary TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow all operations (admin feature)
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage knowledge sources (admin only page anyway)
CREATE POLICY "Allow all operations for authenticated users"
ON public.knowledge_sources
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_knowledge_sources_updated_at
BEFORE UPDATE ON public.knowledge_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();