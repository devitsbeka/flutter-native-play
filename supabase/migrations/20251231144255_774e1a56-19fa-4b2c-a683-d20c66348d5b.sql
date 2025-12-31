-- Create user_power_ups table to store power-up quantities
CREATE TABLE public.user_power_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  power_up_type TEXT NOT NULL CHECK (power_up_type IN ('5050', 'freeze', 'replace', 'time-drain')),
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, power_up_type)
);

-- Enable RLS
ALTER TABLE public.user_power_ups ENABLE ROW LEVEL SECURITY;

-- Users can view their own power-ups
CREATE POLICY "Users can view own power-ups" ON public.user_power_ups
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own power-ups
CREATE POLICY "Users can update own power-ups" ON public.user_power_ups
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own power-ups
CREATE POLICY "Users can insert own power-ups" ON public.user_power_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_power_ups_updated_at
  BEFORE UPDATE ON public.user_power_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();