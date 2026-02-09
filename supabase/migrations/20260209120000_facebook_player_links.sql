-- Facebook Instant Games player identity linking
--
-- Links Facebook app-scoped player IDs to Supabase users so that:
--   1. A player's progress persists across FB sessions
--   2. A player can link their FB identity to an existing web/mobile account
--   3. Cross-platform friend discovery works (FB friends → Supabase friends)

CREATE TABLE IF NOT EXISTS facebook_player_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_player_id TEXT UNIQUE NOT NULL,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facebook_name TEXT,
  facebook_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by Facebook player ID (used on every FB game launch)
CREATE INDEX IF NOT EXISTS idx_facebook_player_links_fb_id
  ON facebook_player_links(facebook_player_id);

-- Index for finding the FB link for a given Supabase user (used for account linking UI)
CREATE INDEX IF NOT EXISTS idx_facebook_player_links_supabase_id
  ON facebook_player_links(supabase_user_id);

-- Row Level Security
ALTER TABLE facebook_player_links ENABLE ROW LEVEL SECURITY;

-- Users can read their own link
CREATE POLICY "Users can view their own facebook link"
  ON facebook_player_links FOR SELECT
  USING (auth.uid() = supabase_user_id);

-- Only service role can insert/update (the facebook-auth edge function uses service role)
-- No INSERT/UPDATE/DELETE policies for regular users - all writes go through the edge function.

-- Add platform column to purchase_transactions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_transactions' AND column_name = 'platform'
  ) THEN
    ALTER TABLE purchase_transactions ADD COLUMN platform TEXT DEFAULT 'web';
  END IF;
END $$;

-- Add transaction_id column to purchase_transactions for idempotency checking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_transactions' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE purchase_transactions ADD COLUMN transaction_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_transactions_tx_id
      ON purchase_transactions(transaction_id) WHERE transaction_id IS NOT NULL;
  END IF;
END $$;
