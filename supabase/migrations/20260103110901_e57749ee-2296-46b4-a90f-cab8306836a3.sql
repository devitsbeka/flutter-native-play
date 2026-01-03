-- Add reward tracking columns to user_missions
ALTER TABLE public.user_missions 
ADD COLUMN IF NOT EXISTS reward_claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS reward_coins integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_gems integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_power_up text,
ADD COLUMN IF NOT EXISTS reward_power_up_count integer NOT NULL DEFAULT 0;