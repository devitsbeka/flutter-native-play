-- Add language column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'ka';

-- Create index for fast language-based queries
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);

-- Add preferred_language and region to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'ka';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'ge';

-- Create category_translations table for localized category names
CREATE TABLE IF NOT EXISTS category_translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, language)
);

-- Enable RLS on category_translations
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to category translations
CREATE POLICY "Allow public read on category_translations" 
ON category_translations FOR SELECT USING (true);

-- Allow admins to manage translations
CREATE POLICY "Allow admin write on category_translations"
ON category_translations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_category_translations_updated_at
  BEFORE UPDATE ON category_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();