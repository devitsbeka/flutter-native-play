-- Add icon_slug column to categories for storing the selected icon from icon-library
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS icon_slug text;