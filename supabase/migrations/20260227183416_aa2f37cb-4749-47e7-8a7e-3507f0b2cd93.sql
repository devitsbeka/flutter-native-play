-- Add age_group column to profiles
-- Values: 'child' (under 16), 'teen' (16-17), 'adult' (18+)
-- Default to NULL so we can detect users who haven't set it yet
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_group text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.age_group IS 'User age group: child (under 16), teen (16-17), adult (18+). NULL means not yet set.';