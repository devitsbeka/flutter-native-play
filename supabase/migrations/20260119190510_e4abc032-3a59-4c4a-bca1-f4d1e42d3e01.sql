-- Create app_settings table for admin-configurable settings (API keys, etc.)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admins can read app settings"
ON public.app_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert Stripe setting placeholders
INSERT INTO public.app_settings (key, description, is_secret) VALUES
  ('stripe_secret_key', 'Stripe Secret Key for payment processing', true),
  ('stripe_webhook_secret', 'Stripe Webhook Secret for verifying events', true);

-- Add price_gel and bonus_percentage columns to iap_products
ALTER TABLE public.iap_products 
ADD COLUMN IF NOT EXISTS price_gel NUMERIC,
ADD COLUMN IF NOT EXISTS bonus_percentage INTEGER DEFAULT 0;

-- Insert diamond packages for Lari purchases
INSERT INTO public.iap_products (id, name, description, price_usd, price_gel, gems_value, bonus_percentage, is_active, sort_order, is_subscription)
VALUES 
  ('gems_100', 'მცირე პაკეტი', '100 ალმასი', 0.80, 2.00, 100, 0, true, 1, false),
  ('gems_500', 'საშუალო პაკეტი', '500 ალმასი', 3.20, 8.00, 500, 0, true, 2, false),
  ('gems_1500', 'დიდი პაკეტი', '1500 ალმასი (1250 + 20% ბონუსი)', 8.00, 20.00, 1500, 20, true, 3, false),
  ('gems_5000', 'მეგა პაკეტი', '5000 ალმასი (3571 + 40% ბონუსი)', 24.00, 60.00, 5000, 40, true, 4, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_gel = EXCLUDED.price_gel,
  gems_value = EXCLUDED.gems_value,
  bonus_percentage = EXCLUDED.bonus_percentage,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Create gem_purchases table for transaction logging
CREATE TABLE public.gem_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id TEXT NOT NULL,
  gems_received INTEGER NOT NULL,
  amount_gel NUMERIC NOT NULL,
  payment_provider TEXT DEFAULT 'stripe',
  payment_intent_id TEXT,
  checkout_session_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on gem_purchases
ALTER TABLE public.gem_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own gem purchases"
ON public.gem_purchases FOR SELECT
USING (auth.uid() = user_id);

-- Edge functions can insert purchases (via service role)
CREATE POLICY "Service role can manage gem purchases"
ON public.gem_purchases FOR ALL
USING (true)
WITH CHECK (true);

-- Admins can view all purchases
CREATE POLICY "Admins can view all gem purchases"
ON public.gem_purchases FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_gem_purchases_user_id ON public.gem_purchases(user_id);
CREATE INDEX idx_gem_purchases_status ON public.gem_purchases(status);
CREATE INDEX idx_gem_purchases_checkout_session ON public.gem_purchases(checkout_session_id);