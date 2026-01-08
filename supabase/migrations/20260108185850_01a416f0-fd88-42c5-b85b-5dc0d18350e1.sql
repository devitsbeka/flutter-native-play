-- Create table for collection drafts
CREATE TABLE public.collection_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  cover_image TEXT,
  cover_gradient TEXT DEFAULT 'from-purple-500 to-indigo-600',
  is_public BOOLEAN DEFAULT true,
  rounds_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collection_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view their own drafts"
ON public.collection_drafts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create their own drafts"
ON public.collection_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
ON public.collection_drafts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
ON public.collection_drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_collection_drafts_updated_at
BEFORE UPDATE ON public.collection_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();