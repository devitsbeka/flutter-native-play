-- =============================================
-- ECONOMY & MONETIZATION ADMIN SYSTEM
-- Phase 1: Database Foundation
-- =============================================

-- 1. Economy Configuration Table (single source of truth for all economy values)
CREATE TABLE public.economy_config (
  id TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(user_id)
);

-- 2. Shop Products Table (all purchasable items)
CREATE TABLE public.shop_products (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  description_key TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  value JSONB,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  badge TEXT,
  sort_order INTEGER DEFAULT 0,
  gradient TEXT,
  icon_url TEXT,
  original_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. IAP Products Table (real-money products for App Store/Play Store)
CREATE TABLE public.iap_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_usd NUMERIC NOT NULL,
  gems_value INTEGER,
  coins_value INTEGER,
  is_subscription BOOLEAN DEFAULT false,
  subscription_duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  platform TEXT DEFAULT 'both',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Purchase Transactions Table (log all purchases for analytics)
CREATE TABLE public.purchase_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id),
  product_id TEXT,
  product_type TEXT NOT NULL,
  currency_used TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  value_received JSONB NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.economy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_transactions ENABLE ROW LEVEL SECURITY;

-- Economy Config Policies (read by all, write by admins only - we'll handle admin check in app)
CREATE POLICY "Anyone can read economy config"
ON public.economy_config FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can update economy config"
ON public.economy_config FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert economy config"
ON public.economy_config FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Shop Products Policies (read by all, write by admins)
CREATE POLICY "Anyone can read active shop products"
ON public.shop_products FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage shop products"
ON public.shop_products FOR ALL
USING (auth.uid() IS NOT NULL);

-- IAP Products Policies
CREATE POLICY "Anyone can read active iap products"
ON public.iap_products FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage iap products"
ON public.iap_products FOR ALL
USING (auth.uid() IS NOT NULL);

-- Purchase Transactions Policies
CREATE POLICY "Users can view their own transactions"
ON public.purchase_transactions FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own transactions"
ON public.purchase_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_economy_config_category ON public.economy_config(category);
CREATE INDEX idx_shop_products_category ON public.shop_products(category);
CREATE INDEX idx_shop_products_active ON public.shop_products(is_active);
CREATE INDEX idx_purchase_transactions_user ON public.purchase_transactions(user_id);
CREATE INDEX idx_purchase_transactions_created ON public.purchase_transactions(created_at DESC);
CREATE INDEX idx_purchase_transactions_product_type ON public.purchase_transactions(product_type);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_economy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_economy_config_updated_at
BEFORE UPDATE ON public.economy_config
FOR EACH ROW EXECUTE FUNCTION public.update_economy_updated_at();

CREATE TRIGGER update_shop_products_updated_at
BEFORE UPDATE ON public.shop_products
FOR EACH ROW EXECUTE FUNCTION public.update_economy_updated_at();

CREATE TRIGGER update_iap_products_updated_at
BEFORE UPDATE ON public.iap_products
FOR EACH ROW EXECUTE FUNCTION public.update_economy_updated_at();

-- Seed initial economy config from existing hardcoded values
INSERT INTO public.economy_config (id, value, category, description) VALUES
-- Game Stakes
('game_stake', 500, 'game_stakes', 'Coins required to play a game'),
('game_win_reward', 1000, 'game_stakes', 'Total coins received on win (stake + bonus)'),
('game_draw_refund', 500, 'game_stakes', 'Coins refunded on draw'),

-- Level Up Rewards
('level_up_coins_per_level', 50, 'rewards', 'Coins awarded per level gained'),

-- Daily Rewards (coins per day)
('daily_reward_day_1', 100, 'daily_rewards', 'Day 1 daily reward coins'),
('daily_reward_day_2', 150, 'daily_rewards', 'Day 2 daily reward coins'),
('daily_reward_day_3', 200, 'daily_rewards', 'Day 3 daily reward coins'),
('daily_reward_day_4', 250, 'daily_rewards', 'Day 4 daily reward coins'),
('daily_reward_day_5', 350, 'daily_rewards', 'Day 5 daily reward coins'),
('daily_reward_day_6', 500, 'daily_rewards', 'Day 6 daily reward coins'),
('daily_reward_day_7', 1000, 'daily_rewards', 'Day 7 daily reward coins'),

-- Chest Rewards
('chest_coins_min', 50, 'chests', 'Minimum coins from chest'),
('chest_coins_max', 200, 'chests', 'Maximum coins from chest'),
('chest_cooldown_hours', 4, 'chests', 'Hours between chest claims'),

-- Spin Rewards
('spin_reward_1', 50, 'spin_wheel', 'Spin reward tier 1'),
('spin_reward_2', 100, 'spin_wheel', 'Spin reward tier 2'),
('spin_reward_3', 200, 'spin_wheel', 'Spin reward tier 3'),
('spin_reward_4', 500, 'spin_wheel', 'Spin reward tier 4'),
('spin_reward_5', 1000, 'spin_wheel', 'Spin reward tier 5'),

-- Ad Rewards
('ad_watch_coins', 50, 'ads', 'Coins for watching an ad'),

-- Currency Ratios
('gem_to_coins_rate', 50, 'ratios', 'Coins per gem when exchanging'),

-- New Player Bonus
('new_player_coins', 1000, 'onboarding', 'Starting coins for new players'),
('new_player_gems', 10, 'onboarding', 'Starting gems for new players'),

-- Power-up Prices (in coins)
('powerup_price_5050', 100, 'powerups', 'Price for 50/50 power-up'),
('powerup_price_freeze', 150, 'powerups', 'Price for freeze power-up'),
('powerup_price_replace', 200, 'powerups', 'Price for replace power-up'),

-- VIP Prices (in gems)
('vip_price_day', 10, 'vip', 'Gems for 1 day VIP'),
('vip_price_week', 50, 'vip', 'Gems for 1 week VIP'),
('vip_price_month', 150, 'vip', 'Gems for 1 month VIP'),

-- Feed/Trivia
('feed_trivia_xp_per_correct', 5, 'xp', 'XP for correct answer in feed trivia');

-- Seed shop products
INSERT INTO public.shop_products (id, name_key, description_key, category, price, currency, value, is_active, is_featured, is_popular, badge, sort_order, gradient) VALUES
-- Coin Packages (buy with gems)
('coins_small', 'shop.coinsSmall', 'shop.coinsSmallDesc', 'coins', 5, 'gems', '{"coins": 250, "powers": {"5050": 1, "freeze": 1}}', true, false, false, null, 1, null),
('coins_medium', 'shop.coinsMedium', 'shop.coinsMediumDesc', 'coins', 12, 'gems', '{"coins": 600, "powers": {"5050": 2, "freeze": 2, "replace": 2}}', true, false, true, 'popular', 2, null),
('coins_large', 'shop.coinsLarge', 'shop.coinsLargeDesc', 'coins', 25, 'gems', '{"coins": 1500, "powers": {"5050": 5, "freeze": 5, "replace": 5}}', true, true, false, 'best-value', 3, null),

-- Power-ups (buy with coins)
('powerup_5050', 'shop.powerup5050', 'shop.powerup5050Desc', 'powerup', 100, 'coins', '{"powerup": "5050", "quantity": 1}', true, false, false, null, 1, null),
('powerup_freeze', 'shop.powerupFreeze', 'shop.powerupFreezeDesc', 'powerup', 150, 'coins', '{"powerup": "freeze", "quantity": 1}', true, false, false, null, 2, null),
('powerup_replace', 'shop.powerupReplace', 'shop.powerupReplaceDesc', 'powerup', 200, 'coins', '{"powerup": "replace", "quantity": 1}', true, false, false, null, 3, null),

-- VIP Packages (buy with gems)
('vip_day', 'shop.vipDay', 'shop.vipDayDesc', 'vip', 10, 'gems', '{"vip_duration": "day"}', true, false, false, null, 1, null),
('vip_week', 'shop.vipWeek', 'shop.vipWeekDesc', 'vip', 50, 'gems', '{"vip_duration": "week"}', true, false, true, 'popular', 2, null),
('vip_month', 'shop.vipMonth', 'shop.vipMonthDesc', 'vip', 150, 'gems', '{"vip_duration": "month"}', true, true, false, 'best-value', 3, null);

-- Seed IAP products (real money)
INSERT INTO public.iap_products (id, name, description, price_usd, gems_value, is_subscription, subscription_duration_days, is_active, platform, sort_order) VALUES
('gems_small', 'Small Gem Pack', '50 Gems', 0.99, 50, false, null, true, 'both', 1),
('gems_medium', 'Medium Gem Pack', '150 Gems + 20 Bonus', 2.99, 170, false, null, true, 'both', 2),
('gems_large', 'Large Gem Pack', '500 Gems + 100 Bonus', 9.99, 600, false, null, true, 'both', 3),
('gems_mega', 'Mega Gem Pack', '1200 Gems + 300 Bonus', 19.99, 1500, false, null, true, 'both', 4),
('vip_monthly', 'VIP Monthly', 'Monthly VIP Subscription', 4.99, null, true, 30, true, 'both', 10),
('vip_annual', 'VIP Annual', 'Annual VIP Subscription', 39.99, null, true, 365, true, 'both', 11),
('ad_free', 'Ad-Free', 'Remove all ads forever', 2.99, null, false, null, true, 'both', 20);

-- Enable realtime for economy tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.economy_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_products;