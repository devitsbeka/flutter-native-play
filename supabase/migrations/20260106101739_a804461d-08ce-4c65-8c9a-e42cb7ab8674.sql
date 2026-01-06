-- Add column to mark categories as language-specific (like Literature, History)
-- vs universal categories (like Sports, Movies, Science) that apply to all languages

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_language_specific BOOLEAN DEFAULT false;

-- Mark Georgian-specific categories as language-specific
UPDATE public.categories 
SET is_language_specific = true 
WHERE category_id IN ('georgian_history', 'georgian_literature');

-- Comment: For other languages, we'll create new category rows with the same structure
-- but different language values (e.g., 'english_literature' with language='en')

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_categories_is_language_specific ON public.categories(is_language_specific);