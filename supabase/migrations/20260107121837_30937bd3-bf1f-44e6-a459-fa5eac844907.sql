-- Create table to track user's last seen level counts for notification purposes
CREATE TABLE IF NOT EXISTS user_category_last_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  last_seen_total_levels integer NOT NULL DEFAULT 0,
  last_notified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE user_category_last_seen ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own last seen"
  ON user_category_last_seen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own last seen"
  ON user_category_last_seen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own last seen"
  ON user_category_last_seen FOR UPDATE
  USING (auth.uid() = user_id);

-- Add levels_updated_at to categories to track when new levels become available
ALTER TABLE categories ADD COLUMN IF NOT EXISTS levels_updated_at timestamptz DEFAULT now();

-- Update the trigger to also set levels_updated_at when total_levels increases
CREATE OR REPLACE FUNCTION update_category_total_levels()
RETURNS TRIGGER AS $$
DECLARE
  affected_category_id uuid;
  old_total_levels integer;
  new_total_levels integer;
BEGIN
  -- Get the category_id from either OLD or NEW depending on operation
  IF TG_OP = 'DELETE' THEN
    affected_category_id := OLD.category_id;
  ELSE
    affected_category_id := NEW.category_id;
  END IF;
  
  -- Get current total_levels
  SELECT total_levels INTO old_total_levels FROM categories WHERE id = affected_category_id;
  
  -- Calculate new total_levels
  SELECT GREATEST(1, FLOOR(COUNT(*)::decimal / 10)::integer) INTO new_total_levels
  FROM questions q
  WHERE q.category_id = affected_category_id AND q.is_active = true;
  
  -- Update the category's total_levels and levels_updated_at if increased
  UPDATE categories
  SET total_levels = new_total_levels,
      levels_updated_at = CASE 
        WHEN new_total_levels > COALESCE(old_total_levels, 0) THEN now()
        ELSE levels_updated_at
      END
  WHERE id = affected_category_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_category_last_seen_user_category 
ON user_category_last_seen(user_id, category_id);