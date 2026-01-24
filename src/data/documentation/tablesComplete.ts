// Complete Database Tables Documentation
// Documents ALL 79 tables in the Supabase database

import { TableDoc, TableColumn, TableRelation } from './tables';

// ============= ECONOMY TABLES =============

export const TABLE_ECONOMY_CONFIG: TableDoc = {
  name: 'economy_config',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Dynamic economy configuration. Stores configurable values like reward amounts, costs, and rates.',
  descriptionKa: 'დინამიური ეკონომიკის კონფიგურაცია. ინახავს კონფიგურირებად მნიშვნელობებს, როგორიცაა ჯილდოების რაოდენობა, ფასები და განაკვეთები.',
  columns: [
    { name: 'key', type: 'text', nullable: false, description: 'Config key name', descriptionKa: 'კონფიგურაციის გასაღების სახელი' },
    { name: 'value', type: 'integer', nullable: false, description: 'Config value', descriptionKa: 'კონფიგურაციის მნიშვნელობა' },
    { name: 'description', type: 'text', nullable: true, description: 'Human-readable description', descriptionKa: 'ადამიანისთვის წაკითხვადი აღწერა' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update timestamp', descriptionKa: 'ბოლო განახლების დროის ნიშნული' },
  ],
  rlsPolicies: ['Anyone can read', 'Admins can update'],
  usedBy: ['useEconomyConfig', 'rewardConfig.ts']
};

export const TABLE_USER_POWER_UPS: TableDoc = {
  name: 'user_power_ups',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'User inventory of power-ups. Tracks quantity of each power-up type owned.',
  descriptionKa: 'მომხმარებლის power-up-ების ინვენტარი. თვალყურს ადევნებს თითოეული power-up-ის ტიპის საკუთრებაში არსებულ რაოდენობას.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'double_points', type: 'integer', nullable: true, defaultValue: '0', description: '2x points power-ups owned', descriptionKa: '2x ქულების power-up-ები საკუთრებაში' },
    { name: 'fifty_fifty', type: 'integer', nullable: true, defaultValue: '0', description: '50/50 power-ups owned', descriptionKa: '50/50 power-up-ები საკუთრებაში' },
    { name: 'skip_question', type: 'integer', nullable: true, defaultValue: '0', description: 'Skip question power-ups owned', descriptionKa: 'კითხვის გამოტოვების power-up-ები საკუთრებაში' },
    { name: 'extra_time', type: 'integer', nullable: true, defaultValue: '0', description: 'Extra time power-ups owned', descriptionKa: 'დამატებითი დროის power-up-ები საკუთრებაში' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can view/update own power-ups'],
  usedBy: ['useUserPowerUps', 'PowerUpsPage', 'Game']
};

export const TABLE_USER_DAILY_REWARDS: TableDoc = {
  name: 'user_daily_rewards',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Tracks daily reward claims and chest cooldowns. One row per user.',
  descriptionKa: 'თვალყურს ადევნებს ყოველდღიური ჯილდოების მოთხოვნებს და ზურგჩანთის cooldown-ებს. ერთი რიგი თითოეულ მომხმარებელზე.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'last_daily_claim', type: 'timestamptz', nullable: true, description: 'Last daily reward claim', descriptionKa: 'ბოლო ყოველდღიური ჯილდოს მოთხოვნა' },
    { name: 'last_chest_claim', type: 'timestamptz', nullable: true, description: 'Last chest claim', descriptionKa: 'ბოლო ზურგჩანთის მოთხოვნა' },
    { name: 'daily_streak', type: 'integer', nullable: true, defaultValue: '0', description: 'Consecutive daily claims', descriptionKa: 'ზედიზედ ყოველდღიური მოთხოვნები' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'First claim timestamp', descriptionKa: 'პირველი მოთხოვნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view/update own rewards'],
  usedBy: ['useRewardTimers', 'ChestRewardModal', 'DailyRewardsModal']
};

export const TABLE_USER_DAILY_SPINS: TableDoc = {
  name: 'user_daily_spins',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Tracks lucky wheel spin usage per day.',
  descriptionKa: 'თვალყურს ადევნებს იღბლიანი ბორბლის სპინის გამოყენებას დღეში.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'spin_date', type: 'date', nullable: false, description: 'Date of spins', descriptionKa: 'სპინების თარიღი' },
    { name: 'spins_used', type: 'integer', nullable: true, defaultValue: '0', description: 'Spins used today', descriptionKa: 'დღეს გამოყენებული სპინები' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view/update own spins'],
  usedBy: ['LuckyWheelModal']
};

export const TABLE_SHOP_PRODUCTS: TableDoc = {
  name: 'shop_products',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Products available in the in-game shop. Gems, coins, power-up bundles.',
  descriptionKa: 'თამაშში მაღაზიაში ხელმისაწვდომი პროდუქტები. ლალები, მონეტები, power-up-ების პაკეტები.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'product_id', type: 'text', nullable: false, description: 'Unique product slug', descriptionKa: 'უნიკალური პროდუქტის slug' },
    { name: 'name', type: 'text', nullable: false, description: 'Display name', descriptionKa: 'საჩვენებელი სახელი' },
    { name: 'description', type: 'text', nullable: true, description: 'Product description', descriptionKa: 'პროდუქტის აღწერა' },
    { name: 'category', type: 'text', nullable: false, description: 'gems, coins, power_ups, bundles', descriptionKa: 'gems, coins, power_ups, bundles' },
    { name: 'price_gems', type: 'integer', nullable: true, description: 'Price in gems', descriptionKa: 'ფასი ლალებში' },
    { name: 'price_coins', type: 'integer', nullable: true, description: 'Price in coins', descriptionKa: 'ფასი მონეტებში' },
    { name: 'price_usd', type: 'numeric', nullable: true, description: 'USD price for IAP', descriptionKa: 'USD ფასი IAP-ისთვის' },
    { name: 'reward_gems', type: 'integer', nullable: true, description: 'Gems given', descriptionKa: 'მიცემული ლალები' },
    { name: 'reward_coins', type: 'integer', nullable: true, description: 'Coins given', descriptionKa: 'მიცემული მონეტები' },
    { name: 'reward_power_ups', type: 'jsonb', nullable: true, description: 'Power-ups given', descriptionKa: 'მიცემული power-up-ები' },
    { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Available for purchase', descriptionKa: 'ხელმისაწვდომია შესაძენად' },
    { name: 'sort_order', type: 'integer', nullable: true, description: 'Display order', descriptionKa: 'ჩვენების თანმიმდევრობა' },
    { name: 'badge_text', type: 'text', nullable: true, description: 'e.g. "Best Value"', descriptionKa: 'მაგ. "საუკეთესო ღირებულება"' },
  ],
  rlsPolicies: ['Anyone can view active products', 'Admins can CRUD'],
  usedBy: ['useShopProducts', 'PowerUpsPage', 'GemShop']
};

export const TABLE_IAP_PRODUCTS: TableDoc = {
  name: 'iap_products',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'iOS/Android in-app purchase product definitions synced with stores.',
  descriptionKa: 'iOS/Android აპლიკაციაში შესყიდვის პროდუქტების განსაზღვრებები სინქრონიზებული მაღაზიებთან.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'product_id', type: 'text', nullable: false, description: 'Store product ID', descriptionKa: 'მაღაზიის პროდუქტის ID' },
    { name: 'platform', type: 'text', nullable: false, description: 'ios, android, web', descriptionKa: 'ios, android, web' },
    { name: 'product_type', type: 'text', nullable: false, description: 'consumable, subscription', descriptionKa: 'consumable, subscription' },
    { name: 'gems_amount', type: 'integer', nullable: true, description: 'Gems to grant', descriptionKa: 'მისაცემი ლალები' },
    { name: 'is_active', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Available for purchase', descriptionKa: 'ხელმისაწვდომია შესაძენად' },
  ],
  rlsPolicies: ['Anyone can view active IAP products'],
  usedBy: ['useInAppPurchases', 'verify-receipt']
};

export const TABLE_GEM_PURCHASES: TableDoc = {
  name: 'gem_purchases',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Transaction log for all gem purchases.',
  descriptionKa: 'ტრანზაქციის ჟურნალი ლალების ყველა შესყიდვისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Purchaser', descriptionKa: 'მყიდველი' },
    { name: 'product_id', type: 'text', nullable: false, description: 'Product purchased', descriptionKa: 'შეძენილი პროდუქტი' },
    { name: 'amount_gems', type: 'integer', nullable: false, description: 'Gems granted', descriptionKa: 'მიცემული ლალები' },
    { name: 'amount_paid', type: 'numeric', nullable: true, description: 'Amount paid', descriptionKa: 'გადახდილი თანხა' },
    { name: 'currency', type: 'text', nullable: true, defaultValue: 'USD', description: 'Payment currency', descriptionKa: 'გადახდის ვალუტა' },
    { name: 'payment_provider', type: 'text', nullable: true, description: 'stripe, apple, google', descriptionKa: 'stripe, apple, google' },
    { name: 'transaction_id', type: 'text', nullable: true, description: 'External transaction ID', descriptionKa: 'გარე ტრანზაქციის ID' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Purchase timestamp', descriptionKa: 'შესყიდვის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own purchases', 'System inserts on purchase'],
  usedBy: ['stripe-gem-webhook', 'verify-receipt', 'PurchaseHistory']
};

export const TABLE_PURCHASE_TRANSACTIONS: TableDoc = {
  name: 'purchase_transactions',
  category: 'Economy',
  categoryKa: 'ეკონომიკა',
  description: 'Detailed transaction records for all purchases including in-game and IAP.',
  descriptionKa: 'დეტალური ტრანზაქციების ჩანაწერები ყველა შესყიდვისთვის, მათ შორის თამაშში და IAP.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'User who made purchase', descriptionKa: 'მომხმარებელი, რომელმაც გააკეთა შესყიდვა' },
    { name: 'transaction_type', type: 'text', nullable: false, description: 'purchase, reward, spend, refund', descriptionKa: 'purchase, reward, spend, refund' },
    { name: 'item_type', type: 'text', nullable: false, description: 'gems, coins, power_up, frame', descriptionKa: 'gems, coins, power_up, frame' },
    { name: 'item_id', type: 'text', nullable: true, description: 'Specific item ID', descriptionKa: 'კონკრეტული ელემენტის ID' },
    { name: 'amount', type: 'integer', nullable: false, description: 'Quantity', descriptionKa: 'რაოდენობა' },
    { name: 'balance_before', type: 'integer', nullable: true, description: 'Balance before transaction', descriptionKa: 'ბალანსი ტრანზაქციამდე' },
    { name: 'balance_after', type: 'integer', nullable: true, description: 'Balance after transaction', descriptionKa: 'ბალანსი ტრანზაქციის შემდეგ' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Transaction timestamp', descriptionKa: 'ტრანზაქციის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own transactions'],
  usedBy: ['TransactionHistory', 'useCurrency']
};

// ============= USER PROGRESS TABLES =============

export const TABLE_USER_LEVEL_PROGRESS: TableDoc = {
  name: 'user_level_progress',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Tracks per-category, per-level completion. Stars earned and completion status.',
  descriptionKa: 'თვალყურს ადევნებს თითოეული კატეგორიის, თითოეული დონის დასრულებას. მიღებული ვარსკვლავები და დასრულების სტატუსი.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'category_id', type: 'text', nullable: false, description: 'Category slug', descriptionKa: 'კატეგორიის slug' },
    { name: 'level_number', type: 'integer', nullable: false, description: 'Level 1-N', descriptionKa: 'დონე 1-N' },
    { name: 'stars_earned', type: 'integer', nullable: true, defaultValue: '0', description: 'Stars 0-3', descriptionKa: 'ვარსკვლავები 0-3' },
    { name: 'completed', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Level completed', descriptionKa: 'დონე დასრულებულია' },
    { name: 'best_score', type: 'integer', nullable: true, description: 'Best score achieved', descriptionKa: 'მიღწეული საუკეთესო ქულა' },
    { name: 'attempts', type: 'integer', nullable: true, defaultValue: '0', description: 'Total attempts', descriptionKa: 'მცდელობების ჯამი' },
    { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'First completion', descriptionKa: 'პირველი დასრულება' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can view/update own progress'],
  usedBy: ['useCategoryProgress', 'useTotalStars', 'CategoryPage']
};

export const TABLE_USER_CATEGORY_PROGRESS: TableDoc = {
  name: 'user_category_progress',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Aggregated progress per category. Total stars, highest level unlocked.',
  descriptionKa: 'აგრეგირებული პროგრესი თითოეულ კატეგორიაზე. ვარსკვლავების ჯამი, უმაღლესი განბლოკილი დონე.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'category_id', type: 'text', nullable: false, description: 'Category slug', descriptionKa: 'კატეგორიის slug' },
    { name: 'highest_level', type: 'integer', nullable: true, defaultValue: '1', description: 'Highest unlocked level', descriptionKa: 'უმაღლესი განბლოკილი დონე' },
    { name: 'total_stars', type: 'integer', nullable: true, defaultValue: '0', description: 'Total stars in category', descriptionKa: 'ვარსკვლავების ჯამი კატეგორიაში' },
    { name: 'games_played', type: 'integer', nullable: true, defaultValue: '0', description: 'Games in this category', descriptionKa: 'თამაშები ამ კატეგორიაში' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can view/update own progress'],
  usedBy: ['useCategoryProgress', 'CategoryCard']
};

export const TABLE_USER_COUNTRY_PROGRESS: TableDoc = {
  name: 'user_country_progress',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Progress in country-specific quiz categories (geography mode).',
  descriptionKa: 'პროგრესი ქვეყნის სპეციფიკურ ქვიზის კატეგორიებში (გეოგრაფიის რეჟიმი).',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'country_code', type: 'text', nullable: false, description: '2-letter ISO code', descriptionKa: '2-ასოიანი ISO კოდი' },
    { name: 'stars_earned', type: 'integer', nullable: true, defaultValue: '0', description: 'Stars for this country', descriptionKa: 'ვარსკვლავები ამ ქვეყნისთვის' },
    { name: 'completed', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Country completed', descriptionKa: 'ქვეყანა დასრულებულია' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can view/update own progress'],
  usedBy: ['useWorldProgress', 'WorldMapPage']
};

export const TABLE_USER_LEAGUE_DATA: TableDoc = {
  name: 'user_league_data',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Weekly league participation data. XP earned this week, current league tier.',
  descriptionKa: 'ყოველკვირეული ლიგის მონაწილეობის მონაცემები. ამ კვირას მიღებული XP, მიმდინარე ლიგის დონე.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'league_tier', type: 'text', nullable: true, defaultValue: 'bronze', description: 'bronze, silver, gold, diamond', descriptionKa: 'bronze, silver, gold, diamond' },
    { name: 'weekly_xp', type: 'integer', nullable: true, defaultValue: '0', description: 'XP earned this week', descriptionKa: 'ამ კვირას მიღებული XP' },
    { name: 'week_start', type: 'date', nullable: true, description: 'Current week start', descriptionKa: 'მიმდინარე კვირის დასაწყისი' },
    { name: 'last_rank', type: 'integer', nullable: true, description: 'Last week final rank', descriptionKa: 'წინა კვირის საბოლოო რანგი' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Anyone can view league data', 'Users can update own data'],
  usedBy: ['useLeagueLeaderboard', 'Leaderboards', 'LeaguePlayerRow'],
  realtimeEnabled: false
};

export const TABLE_USER_ACHIEVEMENTS: TableDoc = {
  name: 'user_achievements',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Unlocked achievements with unlock timestamp.',
  descriptionKa: 'განბლოკილი მიღწევები განბლოკვის დროის ნიშნულით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'achievement_id', type: 'text', nullable: false, description: 'Achievement identifier', descriptionKa: 'მიღწევის იდენტიფიკატორი' },
    { name: 'unlocked_at', type: 'timestamptz', nullable: true, description: 'When unlocked', descriptionKa: 'როდის განბლოკდა' },
    { name: 'progress', type: 'integer', nullable: true, description: 'Progress if incremental', descriptionKa: 'პროგრესი თუ ინკრემენტულია' },
  ],
  rlsPolicies: ['Users can view own achievements', 'System grants achievements'],
  usedBy: ['useAchievements', 'AchievementsPage', 'ProfilePage']
};

export const TABLE_USER_MISSIONS: TableDoc = {
  name: 'user_missions',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Daily/weekly mission progress and completion status.',
  descriptionKa: 'ყოველდღიური/ყოველკვირეული მისიის პროგრესი და დასრულების სტატუსი.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'mission_id', type: 'text', nullable: false, description: 'Mission identifier', descriptionKa: 'მისიის იდენტიფიკატორი' },
    { name: 'mission_type', type: 'text', nullable: true, description: 'daily, weekly, special', descriptionKa: 'daily, weekly, special' },
    { name: 'progress', type: 'integer', nullable: true, defaultValue: '0', description: 'Current progress', descriptionKa: 'მიმდინარე პროგრესი' },
    { name: 'target', type: 'integer', nullable: true, description: 'Target to complete', descriptionKa: 'სამიზნე დასასრულებლად' },
    { name: 'completed', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Is completed', descriptionKa: 'დასრულებულია თუ არა' },
    { name: 'claimed', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Reward claimed', descriptionKa: 'ჯილდო მოთხოვნილია' },
    { name: 'reset_at', type: 'timestamptz', nullable: true, description: 'When mission resets', descriptionKa: 'როდის რესეტდება მისია' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view/update own missions'],
  usedBy: ['useMissions', 'MissionsPage', 'missionTracker']
};

export const TABLE_USER_MISSION_STREAKS: TableDoc = {
  name: 'user_mission_streaks',
  category: 'Progress',
  categoryKa: 'პროგრესი',
  description: 'Tracks consecutive mission completion streaks.',
  descriptionKa: 'თვალყურს ადევნებს ზედიზედ მისიის დასრულების სერიებს.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'current_streak', type: 'integer', nullable: true, defaultValue: '0', description: 'Current streak days', descriptionKa: 'მიმდინარე სერიის დღეები' },
    { name: 'best_streak', type: 'integer', nullable: true, defaultValue: '0', description: 'Best streak ever', descriptionKa: 'საუკეთესო სერია ოდესმე' },
    { name: 'last_completion_date', type: 'date', nullable: true, description: 'Last mission completion', descriptionKa: 'ბოლო მისიის დასრულება' },
  ],
  rlsPolicies: ['Users can view/update own streaks'],
  usedBy: ['useMissionStreak', 'MissionsPage']
};

// ============= GAME SESSION TABLES =============

export const TABLE_GAME_SESSIONS: TableDoc = {
  name: 'game_sessions',
  category: 'Game Sessions',
  categoryKa: 'თამაშის სესიები',
  description: 'VS mode game sessions. Records match results between user and opponent.',
  descriptionKa: 'VS რეჟიმის თამაშის სესიები. ჩანაწერები მატჩის შედეგებისა მომხმარებელსა და მოწინააღმდეგეს შორის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Player 1', descriptionKa: 'მოთამაშე 1' },
    { name: 'opponent_id', type: 'uuid', nullable: true, description: 'Player 2 (null for AI)', descriptionKa: 'მოთამაშე 2 (null AI-სთვის)' },
    { name: 'opponent_nickname', type: 'text', nullable: true, description: 'Opponent display name', descriptionKa: 'მოწინააღმდეგის საჩვენებელი სახელი' },
    { name: 'opponent_avatar', type: 'text', nullable: true, description: 'Opponent avatar URL', descriptionKa: 'მოწინააღმდეგის ავატარის URL' },
    { name: 'user_score', type: 'integer', nullable: true, defaultValue: '0', description: 'User final score', descriptionKa: 'მომხმარებლის საბოლოო ქულა' },
    { name: 'opponent_score', type: 'integer', nullable: true, defaultValue: '0', description: 'Opponent final score', descriptionKa: 'მოწინააღმდეგის საბოლოო ქულა' },
    { name: 'result', type: 'text', nullable: true, description: 'win, lose, draw', descriptionKa: 'win, lose, draw' },
    { name: 'category_id', type: 'text', nullable: true, description: 'Category played', descriptionKa: 'ნათამაშები კატეგორია' },
    { name: 'coins_earned', type: 'integer', nullable: true, defaultValue: '0', description: 'Coins from match', descriptionKa: 'მატჩიდან მიღებული მონეტები' },
    { name: 'xp_earned', type: 'integer', nullable: true, defaultValue: '0', description: 'XP from match', descriptionKa: 'მატჩიდან მიღებული XP' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Session start', descriptionKa: 'სესიის დაწყება' },
    { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Session end', descriptionKa: 'სესიის დასრულება' },
  ],
  rlsPolicies: ['Users can view own sessions', 'System creates sessions'],
  usedBy: ['useRecentPlayers', 'GameResultScreen', 'ProfilePage']
};

export const TABLE_PLAYER_ANSWERS: TableDoc = {
  name: 'player_answers',
  category: 'Game Sessions',
  categoryKa: 'თამაშის სესიები',
  description: 'Individual answer records for analytics and review.',
  descriptionKa: 'ინდივიდუალური პასუხების ჩანაწერები ანალიტიკისა და განხილვისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'session_id', type: 'uuid', nullable: true, description: 'FK to game_sessions', descriptionKa: 'FK game_sessions-ზე' },
    { name: 'room_game_id', type: 'uuid', nullable: true, description: 'FK to room_games', descriptionKa: 'FK room_games-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Player who answered', descriptionKa: 'მოთამაშე, რომელმაც უპასუხა' },
    { name: 'question_id', type: 'uuid', nullable: true, description: 'FK to questions', descriptionKa: 'FK questions-ზე' },
    { name: 'answer_given', type: 'text', nullable: true, description: 'Answer selected', descriptionKa: 'არჩეული პასუხი' },
    { name: 'is_correct', type: 'boolean', nullable: true, description: 'Was answer correct', descriptionKa: 'იყო თუ არა პასუხი სწორი' },
    { name: 'time_taken_ms', type: 'integer', nullable: true, description: 'Response time in ms', descriptionKa: 'პასუხის დრო ms-ში' },
    { name: 'points_earned', type: 'integer', nullable: true, description: 'Points for this answer', descriptionKa: 'ქულები ამ პასუხისთვის' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Answer timestamp', descriptionKa: 'პასუხის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own answers', 'System creates answers'],
  usedBy: ['AnswerReview', 'QuestionStats']
};

export const TABLE_GAME_PLAYS: TableDoc = {
  name: 'game_plays',
  category: 'Game Sessions',
  categoryKa: 'თამაშის სესიები',
  description: 'Simplified game play records for quick stats.',
  descriptionKa: 'გამარტივებული თამაშის ჩანაწერები სწრაფი სტატისტიკისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Player', descriptionKa: 'მოთამაშე' },
    { name: 'game_type', type: 'text', nullable: true, description: 'vs, category, room, tv', descriptionKa: 'vs, category, room, tv' },
    { name: 'category_id', type: 'text', nullable: true, description: 'Category played', descriptionKa: 'ნათამაშები კატეგორია' },
    { name: 'score', type: 'integer', nullable: true, description: 'Final score', descriptionKa: 'საბოლოო ქულა' },
    { name: 'won', type: 'boolean', nullable: true, description: 'Did player win', descriptionKa: 'მოიგო თუ არა მოთამაშემ' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Play timestamp', descriptionKa: 'თამაშის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view own plays'],
  usedBy: ['ProfileStats', 'usePlayerProfile']
};

export const TABLE_USER_DAILY_PLAYS: TableDoc = {
  name: 'user_daily_plays',
  category: 'Game Sessions',
  categoryKa: 'თამაშის სესიები',
  description: 'Tracks daily VS game play count for free-to-play limits.',
  descriptionKa: 'თვალყურს ადევნებს ყოველდღიური VS თამაშის რაოდენობას უფასო თამაშის ლიმიტებისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to profiles', descriptionKa: 'FK profiles-ზე' },
    { name: 'play_date', type: 'date', nullable: false, description: 'Date of plays', descriptionKa: 'თამაშების თარიღი' },
    { name: 'plays_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Plays today', descriptionKa: 'თამაშები დღეს' },
    { name: 'extra_plays', type: 'integer', nullable: true, defaultValue: '0', description: 'Bonus plays (ads/VIP)', descriptionKa: 'ბონუს თამაშები (რეკლამები/VIP)' },
  ],
  rlsPolicies: ['Users can view/update own plays'],
  usedBy: ['useDailyPlays', 'DesktopPlayButton']
};

// ============= MULTIPLAYER ROOM TABLES (Additional) =============

export const TABLE_ROOM_GAMES: TableDoc = {
  name: 'room_games',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Individual game rounds within a persistent room.',
  descriptionKa: 'ინდივიდუალური თამაშის რაუნდები მუდმივ ოთახში.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'game_number', type: 'integer', nullable: true, description: 'Game number in room', descriptionKa: 'თამაშის ნომერი ოთახში' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'waiting', description: 'Game status', descriptionKa: 'თამაშის სტატუსი' },
    { name: 'winner_user_id', type: 'uuid', nullable: true, description: 'Winner of this game', descriptionKa: 'ამ თამაშის გამარჯვებული' },
    { name: 'started_at', type: 'timestamptz', nullable: true, description: 'Game start', descriptionKa: 'თამაშის დაწყება' },
    { name: 'completed_at', type: 'timestamptz', nullable: true, description: 'Game end', descriptionKa: 'თამაშის დასრულება' },
  ],
  rlsPolicies: ['Room participants can view games'],
  usedBy: ['useMultiplayerV2', 'RoomHistoryTab'],
  realtimeEnabled: true
};

export const TABLE_ROOM_MATCH_HISTORY: TableDoc = {
  name: 'room_match_history',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Historical record of all room game results.',
  descriptionKa: 'ოთახის თამაშის ყველა შედეგის ისტორიული ჩანაწერი.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'game_id', type: 'uuid', nullable: true, description: 'FK to room_games', descriptionKa: 'FK room_games-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Participant', descriptionKa: 'მონაწილე' },
    { name: 'final_score', type: 'integer', nullable: true, description: 'Final score', descriptionKa: 'საბოლოო ქულა' },
    { name: 'rank', type: 'integer', nullable: true, description: 'Finish position', descriptionKa: 'დასრულების პოზიცია' },
    { name: 'correct_answers', type: 'integer', nullable: true, description: 'Correct count', descriptionKa: 'სწორი რაოდენობა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Record timestamp', descriptionKa: 'ჩანაწერის დროის ნიშნული' },
  ],
  rlsPolicies: ['Room participants can view history'],
  usedBy: ['useRoomMatchHistory', 'RoomStatsTab']
};

export const TABLE_ROOM_CHAT_MESSAGES: TableDoc = {
  name: 'room_chat_messages',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Chat messages within game rooms.',
  descriptionKa: 'ჩათის შეტყობინებები თამაშის ოთახებში.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Message sender', descriptionKa: 'შეტყობინების გამგზავნი' },
    { name: 'nickname', type: 'text', nullable: true, description: 'Sender nickname', descriptionKa: 'გამგზავნის მეტსახელი' },
    { name: 'avatar_url', type: 'text', nullable: true, description: 'Sender avatar', descriptionKa: 'გამგზავნის ავატარი' },
    { name: 'message', type: 'text', nullable: false, description: 'Message content', descriptionKa: 'შეტყობინების კონტენტი' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Sent timestamp', descriptionKa: 'გაგზავნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Room participants can view/send messages'],
  usedBy: ['useRoomChat', 'RoomChatPanel'],
  realtimeEnabled: true
};

export const TABLE_ROOM_CATEGORY_QUEUE: TableDoc = {
  name: 'room_category_queue',
  category: 'Multiplayer',
  categoryKa: 'მულტიპლეიერი',
  description: 'Queue of categories to play in a room.',
  descriptionKa: 'კატეგორიების რიგი ოთახში სათამაშოდ.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'room_id', type: 'uuid', nullable: false, description: 'FK to game_rooms', descriptionKa: 'FK game_rooms-ზე' },
    { name: 'category_id', type: 'text', nullable: true, description: 'Category slug', descriptionKa: 'კატეგორიის slug' },
    { name: 'user_trivia_id', type: 'uuid', nullable: true, description: 'User-created trivia', descriptionKa: 'მომხმარებლის მიერ შექმნილი ტრივია' },
    { name: 'source_type', type: 'text', nullable: true, description: 'category, random, user_trivia', descriptionKa: 'category, random, user_trivia' },
    { name: 'queue_position', type: 'integer', nullable: true, description: 'Position in queue', descriptionKa: 'პოზიცია რიგში' },
    { name: 'played', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Already played', descriptionKa: 'უკვე ნათამაშები' },
    { name: 'added_by', type: 'uuid', nullable: true, description: 'Who added it', descriptionKa: 'ვინ დაამატა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Added timestamp', descriptionKa: 'დამატების დროის ნიშნული' },
  ],
  rlsPolicies: ['Room participants can view/modify queue'],
  usedBy: ['useRoomCategoryQueue', 'PreRoomQueuePreview'],
  realtimeEnabled: true
};

// ============= GAME INVITATIONS =============

export const TABLE_GAME_INVITATIONS: TableDoc = {
  name: 'game_invitations',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Pending game invitations between players.',
  descriptionKa: 'მომლოდინე თამაშის მოწვევები მოთამაშეებს შორის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'sender_id', type: 'uuid', nullable: false, description: 'Invitation sender', descriptionKa: 'მოწვევის გამგზავნი' },
    { name: 'receiver_id', type: 'uuid', nullable: false, description: 'Invitation recipient', descriptionKa: 'მოწვევის მიმღები' },
    { name: 'room_id', type: 'uuid', nullable: true, description: 'Room to join', descriptionKa: 'ოთახი შესასვლელად' },
    { name: 'category_id', type: 'text', nullable: true, description: 'Suggested category', descriptionKa: 'შემოთავაზებული კატეგორია' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'pending', description: 'pending, accepted, declined, expired', descriptionKa: 'pending, accepted, declined, expired' },
    { name: 'expires_at', type: 'timestamptz', nullable: true, description: 'Invitation expiry', descriptionKa: 'მოწვევის ვადის გასვლა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Sent timestamp', descriptionKa: 'გაგზავნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view invitations they sent/received'],
  usedBy: ['useGameInvitations', 'usePendingChallenges', 'NotificationsList'],
  realtimeEnabled: true
};

export const TABLE_FRIEND_INVITES: TableDoc = {
  name: 'friend_invites',
  category: 'Social',
  categoryKa: 'სოციალური',
  description: 'Friend request invitations between users.',
  descriptionKa: 'მეგობრობის მოთხოვნის მოწვევები მომხმარებლებს შორის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'sender_id', type: 'uuid', nullable: false, description: 'Request sender', descriptionKa: 'მოთხოვნის გამგზავნი' },
    { name: 'receiver_id', type: 'uuid', nullable: false, description: 'Request recipient', descriptionKa: 'მოთხოვნის მიმღები' },
    { name: 'status', type: 'text', nullable: true, defaultValue: 'pending', description: 'pending, accepted, declined', descriptionKa: 'pending, accepted, declined' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Sent timestamp', descriptionKa: 'გაგზავნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view invites they sent/received'],
  usedBy: ['useFriendInvites', 'useFriends', 'NotificationsList']
};

// ============= NOTIFICATIONS =============

export const TABLE_NOTIFICATIONS: TableDoc = {
  name: 'notifications',
  category: 'Notifications',
  categoryKa: 'შეტყობინებები',
  description: 'In-app notification storage. Supports multiple notification types.',
  descriptionKa: 'აპლიკაციის შიდა შეტყობინებების საცავი. მხარს უჭერს შეტყობინებების მრავალ ტიპს.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Notification recipient', descriptionKa: 'შეტყობინების მიმღები' },
    { name: 'type', type: 'text', nullable: false, description: 'friend_request, game_invite, achievement, reward, etc', descriptionKa: 'friend_request, game_invite, achievement, reward და ა.შ.' },
    { name: 'title', type: 'text', nullable: true, description: 'Notification title', descriptionKa: 'შეტყობინების სათაური' },
    { name: 'message', type: 'text', nullable: true, description: 'Notification body', descriptionKa: 'შეტყობინების ტექსტი' },
    { name: 'data', type: 'jsonb', nullable: true, description: 'Additional payload', descriptionKa: 'დამატებითი payload' },
    { name: 'read_at', type: 'timestamptz', nullable: true, description: 'When read', descriptionKa: 'როდის წაიკითხა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Created timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can view/update own notifications'],
  usedBy: ['useNotifications', 'NotificationsPage'],
  realtimeEnabled: true
};

export const TABLE_PUSH_TOKENS: TableDoc = {
  name: 'push_tokens',
  category: 'Notifications',
  categoryKa: 'შეტყობინებები',
  description: 'Firebase push notification tokens per device.',
  descriptionKa: 'Firebase push შეტყობინებების ტოკენები თითოეული მოწყობილობისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Token owner', descriptionKa: 'ტოკენის მფლობელი' },
    { name: 'token', type: 'text', nullable: false, description: 'FCM token', descriptionKa: 'FCM ტოკენი' },
    { name: 'platform', type: 'text', nullable: true, description: 'ios, android, web', descriptionKa: 'ios, android, web' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Token registration', descriptionKa: 'ტოკენის რეგისტრაცია' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can manage own tokens', 'System can read for sending'],
  usedBy: ['usePushNotifications', 'send-push-notification']
};

// ============= USER GENERATED CONTENT =============

export const TABLE_USER_QUIZ_POSTS: TableDoc = {
  name: 'user_quiz_posts',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'User-created trivia quizzes with questions embedded.',
  descriptionKa: 'მომხმარებლის მიერ შექმნილი ტრივია ქვიზები ჩაშენებული კითხვებით.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Creator', descriptionKa: 'შემქმნელი' },
    { name: 'title', type: 'text', nullable: false, description: 'Quiz title', descriptionKa: 'ქვიზის სათაური' },
    { name: 'description', type: 'text', nullable: true, description: 'Quiz description', descriptionKa: 'ქვიზის აღწერა' },
    { name: 'cover_image_url', type: 'text', nullable: true, description: 'Cover image', descriptionKa: 'ფარდის სურათი' },
    { name: 'questions', type: 'jsonb', nullable: false, description: 'Array of question objects', descriptionKa: 'კითხვების ობიექტების მასივი' },
    { name: 'category', type: 'text', nullable: true, description: 'Quiz category', descriptionKa: 'ქვიზის კატეგორია' },
    { name: 'hashtags', type: 'text[]', nullable: true, description: 'Hashtags for discovery', descriptionKa: 'ჰეშთეგები აღმოჩენისთვის' },
    { name: 'visibility', type: 'text', nullable: true, defaultValue: 'public', description: 'public, friends, private', descriptionKa: 'public, friends, private' },
    { name: 'play_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Times played', descriptionKa: 'ნათამაშები ჯერადობა' },
    { name: 'like_count', type: 'integer', nullable: true, defaultValue: '0', description: 'Likes received', descriptionKa: 'მიღებული მოწონებები' },
    { name: 'is_published', type: 'boolean', nullable: true, defaultValue: 'false', description: 'Published to feed', descriptionKa: 'გამოქვეყნებულია ფიდზე' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can CRUD own posts', 'Anyone can view public posts'],
  usedBy: ['useSocialFeed', 'CreateTriviaWizard', 'TriviaPostCard']
};

export const TABLE_QUIZ_COLLECTIONS: TableDoc = {
  name: 'quiz_collections',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Collections of quiz posts grouped by user.',
  descriptionKa: 'ქვიზის პოსტების კოლექციები მომხმარებლის მიხედვით დაჯგუფებული.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Collection owner', descriptionKa: 'კოლექციის მფლობელი' },
    { name: 'title', type: 'text', nullable: false, description: 'Collection title', descriptionKa: 'კოლექციის სათაური' },
    { name: 'description', type: 'text', nullable: true, description: 'Collection description', descriptionKa: 'კოლექციის აღწერა' },
    { name: 'cover_image_url', type: 'text', nullable: true, description: 'Cover image', descriptionKa: 'ფარდის სურათი' },
    { name: 'post_ids', type: 'uuid[]', nullable: true, description: 'Array of quiz post IDs', descriptionKa: 'ქვიზის პოსტის ID-ების მასივი' },
    { name: 'is_public', type: 'boolean', nullable: true, defaultValue: 'true', description: 'Public visibility', descriptionKa: 'საჯარო ხილვადობა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Creation timestamp', descriptionKa: 'შექმნის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can CRUD own collections', 'Anyone can view public collections'],
  usedBy: ['CollectionPreviewModal', 'usePlayerProfile']
};

export const TABLE_QUIZ_POST_LIKES: TableDoc = {
  name: 'quiz_post_likes',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Likes on user-created quizzes.',
  descriptionKa: 'მოწონებები მომხმარებლის მიერ შექმნილ ქვიზებზე.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'post_id', type: 'uuid', nullable: false, description: 'FK to user_quiz_posts', descriptionKa: 'FK user_quiz_posts-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'User who liked', descriptionKa: 'მომხმარებელი, რომელმაც მოიწონა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Like timestamp', descriptionKa: 'მოწონების დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can like/unlike', 'Anyone can view likes'],
  usedBy: ['useSocialFeed', 'TriviaPostCard']
};

export const TABLE_QUIZ_POST_SAVES: TableDoc = {
  name: 'quiz_post_saves',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Saved/bookmarked quizzes.',
  descriptionKa: 'შენახული/ჩანიშნული ქვიზები.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'post_id', type: 'uuid', nullable: false, description: 'FK to user_quiz_posts', descriptionKa: 'FK user_quiz_posts-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'User who saved', descriptionKa: 'მომხმარებელი, რომელმაც შეინახა' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Save timestamp', descriptionKa: 'შენახვის დროის ნიშნული' },
  ],
  rlsPolicies: ['Users can save/unsave', 'Users can view own saves'],
  usedBy: ['useSocialFeed', 'SavedTriviaPage']
};

export const TABLE_QUIZ_POST_PLAYS: TableDoc = {
  name: 'quiz_post_plays',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Play records for user-created quizzes.',
  descriptionKa: 'თამაშის ჩანაწერები მომხმარებლის მიერ შექმნილი ქვიზებისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'post_id', type: 'uuid', nullable: false, description: 'FK to user_quiz_posts', descriptionKa: 'FK user_quiz_posts-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Player', descriptionKa: 'მოთამაშე' },
    { name: 'score', type: 'integer', nullable: true, description: 'Final score', descriptionKa: 'საბოლოო ქულა' },
    { name: 'completed', type: 'boolean', nullable: true, description: 'Finished quiz', descriptionKa: 'დასრულებული ქვიზი' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Play timestamp', descriptionKa: 'თამაშის დროის ნიშნული' },
  ],
  rlsPolicies: ['Anyone can record plays', 'Users can view own plays'],
  usedBy: ['TriviaPostCard', 'PlayUserTrivia']
};

export const TABLE_QUIZ_POST_COMMENTS: TableDoc = {
  name: 'quiz_post_comments',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Comments on user-created quizzes.',
  descriptionKa: 'კომენტარები მომხმარებლის მიერ შექმნილ ქვიზებზე.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'post_id', type: 'uuid', nullable: false, description: 'FK to user_quiz_posts', descriptionKa: 'FK user_quiz_posts-ზე' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Commenter', descriptionKa: 'კომენტატორი' },
    { name: 'content', type: 'text', nullable: false, description: 'Comment text', descriptionKa: 'კომენტარის ტექსტი' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Comment timestamp', descriptionKa: 'კომენტარის დროის ნიშნული' },
  ],
  rlsPolicies: ['Anyone can comment', 'Users can delete own comments'],
  usedBy: ['CommentSection']
};

export const TABLE_TRIVIA_DRAFTS: TableDoc = {
  name: 'trivia_drafts',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Unpublished trivia drafts for user editing.',
  descriptionKa: 'გამოუქვეყნებელი ტრივიის მონახაზები მომხმარებლის რედაქტირებისთვის.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Draft owner', descriptionKa: 'მონახაზის მფლობელი' },
    { name: 'title', type: 'text', nullable: true, description: 'Draft title', descriptionKa: 'მონახაზის სათაური' },
    { name: 'questions', type: 'jsonb', nullable: true, description: 'Draft questions', descriptionKa: 'მონახაზის კითხვები' },
    { name: 'draft_type', type: 'text', nullable: true, description: 'url, text, topic', descriptionKa: 'url, text, topic' },
    { name: 'source_url', type: 'text', nullable: true, description: 'Source URL if url type', descriptionKa: 'წყაროს URL თუ url ტიპია' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Draft creation', descriptionKa: 'მონახაზის შექმნა' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can CRUD own drafts'],
  usedBy: ['useTriviaDrafts', 'DraftsPage', 'CreateTriviaWizard']
};

export const TABLE_COLLECTION_DRAFTS: TableDoc = {
  name: 'collection_drafts',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'Unpublished collection drafts.',
  descriptionKa: 'გამოუქვეყნებელი კოლექციის მონახაზები.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Draft owner', descriptionKa: 'მონახაზის მფლობელი' },
    { name: 'title', type: 'text', nullable: true, description: 'Collection title', descriptionKa: 'კოლექციის სათაური' },
    { name: 'rounds', type: 'jsonb', nullable: true, description: 'Rounds in collection', descriptionKa: 'რაუნდები კოლექციაში' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Draft creation', descriptionKa: 'მონახაზის შექმნა' },
    { name: 'updated_at', type: 'timestamptz', nullable: true, description: 'Last update', descriptionKa: 'ბოლო განახლება' },
  ],
  rlsPolicies: ['Users can CRUD own drafts'],
  usedBy: ['CreateCollectionWizard']
};

export const TABLE_KNOWLEDGE_SOURCES: TableDoc = {
  name: 'knowledge_sources',
  category: 'User Content',
  categoryKa: 'მომხმარებლის კონტენტი',
  description: 'URLs and sources used for quiz generation.',
  descriptionKa: 'URL-ები და წყაროები ქვიზის გენერაციისთვის გამოყენებული.',
  columns: [
    { name: 'id', type: 'uuid', nullable: false, description: 'Primary key', descriptionKa: 'პირველადი გასაღები' },
    { name: 'user_id', type: 'uuid', nullable: false, description: 'Source owner', descriptionKa: 'წყაროს მფლობელი' },
    { name: 'url', type: 'text', nullable: false, description: 'Source URL', descriptionKa: 'წყაროს URL' },
    { name: 'title', type: 'text', nullable: true, description: 'Page title', descriptionKa: 'გვერდის სათაური' },
    { name: 'content_summary', type: 'text', nullable: true, description: 'Extracted summary', descriptionKa: 'ამოღებული შეჯამება' },
    { name: 'created_at', type: 'timestamptz', nullable: true, description: 'Source added', descriptionKa: 'წყარო დამატებული' },
  ],
  rlsPolicies: ['Users can view own sources'],
  usedBy: ['parse-quiz-url', 'CreateTriviaWizard']
};

// Export all additional tables
export const ALL_TABLES_COMPLETE = [
  TABLE_ECONOMY_CONFIG,
  TABLE_USER_POWER_UPS,
  TABLE_USER_DAILY_REWARDS,
  TABLE_USER_DAILY_SPINS,
  TABLE_SHOP_PRODUCTS,
  TABLE_IAP_PRODUCTS,
  TABLE_GEM_PURCHASES,
  TABLE_PURCHASE_TRANSACTIONS,
  TABLE_USER_LEVEL_PROGRESS,
  TABLE_USER_CATEGORY_PROGRESS,
  TABLE_USER_COUNTRY_PROGRESS,
  TABLE_USER_LEAGUE_DATA,
  TABLE_USER_ACHIEVEMENTS,
  TABLE_USER_MISSIONS,
  TABLE_USER_MISSION_STREAKS,
  TABLE_GAME_SESSIONS,
  TABLE_PLAYER_ANSWERS,
  TABLE_GAME_PLAYS,
  TABLE_USER_DAILY_PLAYS,
  TABLE_ROOM_GAMES,
  TABLE_ROOM_MATCH_HISTORY,
  TABLE_ROOM_CHAT_MESSAGES,
  TABLE_ROOM_CATEGORY_QUEUE,
  TABLE_GAME_INVITATIONS,
  TABLE_FRIEND_INVITES,
  TABLE_NOTIFICATIONS,
  TABLE_PUSH_TOKENS,
  TABLE_USER_QUIZ_POSTS,
  TABLE_QUIZ_COLLECTIONS,
  TABLE_QUIZ_POST_LIKES,
  TABLE_QUIZ_POST_SAVES,
  TABLE_QUIZ_POST_PLAYS,
  TABLE_QUIZ_POST_COMMENTS,
  TABLE_TRIVIA_DRAFTS,
  TABLE_COLLECTION_DRAFTS,
  TABLE_KNOWLEDGE_SOURCES,
];

// Table categories for navigation
export const TABLE_CATEGORIES_COMPLETE = [
  { id: 'economy', name: 'Economy', nameKa: 'ეკონომიკა', count: 8 },
  { id: 'progress', name: 'Progress', nameKa: 'პროგრესი', count: 7 },
  { id: 'game-sessions', name: 'Game Sessions', nameKa: 'თამაშის სესიები', count: 4 },
  { id: 'multiplayer', name: 'Multiplayer', nameKa: 'მულტიპლეიერი', count: 8 },
  { id: 'social', name: 'Social', nameKa: 'სოციალური', count: 6 },
  { id: 'notifications', name: 'Notifications', nameKa: 'შეტყობინებები', count: 2 },
  { id: 'user-content', name: 'User Content', nameKa: 'მომხმარებლის კონტენტი', count: 10 },
];
