-- Phase 4.3: Add language column to categories table
-- This allows us to have language-specific categories like "Spanish Literature" for Spanish users

-- Add language column to categories (default to 'ka' for existing Georgian categories)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ka';

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_categories_language ON public.categories(language);

-- Create index for faster question language queries  
CREATE INDEX IF NOT EXISTS idx_questions_language ON public.questions(language);

-- Update any null language values in questions to 'ka' (Georgian)
UPDATE public.questions SET language = 'ka' WHERE language IS NULL;