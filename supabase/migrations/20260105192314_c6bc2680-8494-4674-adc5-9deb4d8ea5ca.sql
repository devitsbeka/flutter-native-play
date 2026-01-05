-- Update profiles table defaults for new player starting balance
ALTER TABLE public.profiles 
  ALTER COLUMN coins SET DEFAULT 2000,
  ALTER COLUMN gems SET DEFAULT 10;

-- Update existing players who have less than 500 coins (can't play) with minimum balance
UPDATE public.profiles 
SET coins = 2000 
WHERE coins < 500;