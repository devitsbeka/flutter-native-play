-- Clear icon_slugs that don't exist in the icon library
UPDATE questions q
SET icon_slug = NULL, updated_at = now()
WHERE icon_slug IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM icon_library i WHERE i.slug = q.icon_slug
);