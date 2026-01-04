// Centralized economy configuration
// Establishes base currency values and ratios across the app

export const ECONOMY = {
  // Base currency ratio: 1 Gem = ~50 Coins in value
  GEM_TO_COIN_RATIO: 50,

  // Time gates (in hours)
  CHEST_COOLDOWN_HOURS: 4,
  DAILY_SPIN_LIMIT: 1,
  VIP_BONUS_SPINS: 3,

  // Price tiers for consistent pricing
  TIER_CHEAP: { gems: 3, coins: 150 },
  TIER_MEDIUM: { gems: 10, coins: 500 },
  TIER_EXPENSIVE: { gems: 25, coins: 1250 },
  TIER_PREMIUM: { gems: 50, coins: 2500 },

  // Bundle discount percentages
  BUNDLE_SMALL_DISCOUNT: 0,
  BUNDLE_MEDIUM_DISCOUNT: 20,
  BUNDLE_LARGE_DISCOUNT: 30,
};
