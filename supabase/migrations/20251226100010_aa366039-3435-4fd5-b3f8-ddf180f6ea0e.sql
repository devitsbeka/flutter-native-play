-- Create table for storing avatar generation history
CREATE TABLE public.avatar_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  avatar_url TEXT NOT NULL,
  source_image_url TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.avatar_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own avatar generations" 
ON public.avatar_generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own avatar generations" 
ON public.avatar_generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatar generations" 
ON public.avatar_generations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatar generations" 
ON public.avatar_generations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_avatar_generations_user_id ON public.avatar_generations(user_id);
CREATE INDEX idx_avatar_generations_is_current ON public.avatar_generations(user_id, is_current) WHERE is_current = true;