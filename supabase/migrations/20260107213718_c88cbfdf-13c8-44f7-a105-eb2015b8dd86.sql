-- Create quiz_collections table for bundling multiple quizzes
CREATE TABLE public.quiz_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_gradient TEXT NOT NULL DEFAULT 'from-purple-500 to-indigo-600',
  hashtags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add collection reference to user_quiz_posts
ALTER TABLE public.user_quiz_posts 
ADD COLUMN collection_id UUID REFERENCES public.quiz_collections(id) ON DELETE SET NULL,
ADD COLUMN round_number INTEGER DEFAULT 1;

-- Enable RLS
ALTER TABLE public.quiz_collections ENABLE ROW LEVEL SECURITY;

-- Users can view public collections or their own
CREATE POLICY "View public or own collections" ON public.quiz_collections
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Users can create their own collections
CREATE POLICY "Create own collections" ON public.quiz_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY "Update own collections" ON public.quiz_collections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own collections
CREATE POLICY "Delete own collections" ON public.quiz_collections
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger for collections
CREATE TRIGGER update_quiz_collections_updated_at
  BEFORE UPDATE ON public.quiz_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();