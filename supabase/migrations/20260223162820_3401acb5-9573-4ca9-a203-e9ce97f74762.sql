
-- Mark georgian_cuisine and georgian_culture as language-specific (Georgian only)
UPDATE categories SET is_language_specific = true, language = 'ka' WHERE category_id IN ('georgian_cuisine', 'georgian_culture');
