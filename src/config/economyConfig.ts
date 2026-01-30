// Centralized economy configuration
// Establishes base currency values and ratios across the app
// 
// CORE ECONOMICS:
// - 1 GEL = 10 Gems (min purchase: 3 GEL = 30 gems)
// - 1 Gem = 500 Coins
// - Game stake: 500 coins (1 gem equivalent)
// - 30 gems = 15,000 coins = 1 day VIP

export const ECONOMY = {
  // Base currency ratio: 1 Gem = 500 Coins in value
  GEM_TO_COIN_RATIO: 500,

  // Real money conversion: 1 GEL = 10 Gems
  GEL_TO_GEM_RATIO: 10,

  // Time gates (in hours)
  CHEST_COOLDOWN_HOURS: 6,
  DAILY_SPIN_LIMIT: 1,
  VIP_BONUS_SPINS: 3,

  // Price tiers for consistent pricing (gems are premium, coins are grindable)
  TIER_CHEAP: { gems: 1, coins: 500 },      // 1 game stake
  TIER_MEDIUM: { gems: 3, coins: 1500 },    // 3 game stakes
  TIER_EXPENSIVE: { gems: 10, coins: 5000 }, // 10 game stakes
  TIER_PREMIUM: { gems: 30, coins: 15000 }, // 30 game stakes

  // Bundle discount percentages
  BUNDLE_SMALL_DISCOUNT: 0,
  BUNDLE_MEDIUM_DISCOUNT: 20,
  BUNDLE_LARGE_DISCOUNT: 30,

  // Gem packages (GEL pricing)
  GEM_PACKAGES: [
    { gems: 30, priceGel: 3, bonus: 0 },      // Base rate: 10 gems/GEL
    { gems: 100, priceGel: 9, bonus: 11 },    // 11.1 gems/GEL (11% bonus)
    { gems: 300, priceGel: 25, bonus: 20 },   // 12 gems/GEL (20% bonus)
    { gems: 700, priceGel: 50, bonus: 40 },   // 14 gems/GEL (40% bonus)
  ],
};
