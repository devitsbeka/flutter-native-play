-- Add icon_slug column to questions table for custom icons
ALTER TABLE questions ADD COLUMN IF NOT EXISTS icon_slug text;