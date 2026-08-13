// Centralized reward configuration for the entire app
// 
// ECONOMY BALANCE:
// - 1 Gem = 500 Coins
// - Game stake: 500 coins (win = 1000, lose = 0, draw = 250)
// - 30 gems = 15,000 coins = 1 day VIP = 3 GEL
// - New player gets 1500 coins (3 free games) + 3 gems (1500 coins value)

export const REWARDS = {
  // ===== GAME STAKE SYSTEM =====
  GAME_STAKE: 500,           // Entry fee per game (1 gem value)
  GAME_WIN_REWARD: 500,      // Winner gets +500 (post-game)
  GAME_DRAW_REFUND: 0,       // No coin change on draw
  GAME_LOSE_REWARD: 0,       // Loser already paid stake

  // ===== PLAY REGENERATION SYSTEM =====
  PLAY_REGEN_HOURS: 3,       // 1 play every 3 hours after free games used
  PLAY_REGEN_MAX: 1,         // Max 1 stored regenerated play
  PLAYS_PER_AD: 1,           // 1 play per ad
  MAX_ADS_PER_DAY: 5,        // Limit ad watching per day
  GEMS_FOR_PLAYS: 2,         // 2 gems = instant plays (1000 coins value)
  GEMS_PLAYS_AMOUNT: 2,      // Number of plays for gems

  // ===== LEVEL UP REWARDS (SIMPLIFIED) =====
  LEVEL_UP_COINS: 150,              // Fixed 150 coins per level
  LEVEL_UP_POWER_UP_TYPES: ["5050", "freeze", "replace", "time-drain"] as string[],
  LEVEL_UP_CORRECT_ANSWERS_THRESHOLD: 20, // Level-up modal every 20 correct answers
  
  // DEPRECATED - kept for backwards compatibility
  LEVEL_UP_COINS_PER_LEVEL: 100,
  LEVEL_UP_GEMS_THRESHOLD: 5,

  // ===== DAILY REWARDS - 7-day cycle =====
  // Total week value: ~6,750 coins worth (13.5 games)
  DAILY_REWARDS: [
    { day: 1, coins: 200, gems: 0 },   // 200 coins (40% of stake)
    { day: 2, coins: 300, gems: 0 },   // 300 coins (60% of stake)
    { day: 3, coins: 400, gems: 0 },   // 400 coins (80% of stake)
    { day: 4, coins: 500, gems: 0 },   // 500 coins (1 free game!)
    { day: 5, coins: 750, gems: 0 },   // 750 coins (1.5 games)
    { day: 6, coins: 1000, gems: 0 },  // 1000 coins (2 games)
    { day: 7, coins: 1500, gems: 1 },  // 1500 + 500 = 2000 value (4 games)
  ],

  // ===== CHEST REWARDS (every 6 hours) =====
  CHEST_COINS_MIN: 50,       // Minimum coins from chest
  CHEST_COINS_MAX: 250,      // Maximum coins from chest
  CHEST_GEMS: 0,             // Base gems (0 on normal days)
  CHEST_WEEKEND_GEMS: 1,     // Bonus gem on special days (Saturday/Sunday)
  CHEST_COOLDOWN_HOURS: 24,   // 1x per day max
  CHEST_XP: 0,               // No XP from chest

  // ===== LUCKY SPIN REWARDS - Balanced =====
  SPIN_REWARDS: [
    { type: "coins", value: 100, label: "100 coins" },
    { type: "coins", value: 200, label: "200 coins" },
    { type: "coins", value: 300, label: "300 coins" },
    { type: "coins", value: 500, label: "500 coins" },   // 1 game!
    { type: "coins", value: 150, label: "150 coins" },
    { type: "coins", value: 250, label: "250 coins" },
    { type: "gems", value: 1, label: "1 gem" },        // Rare: 500 coin value
    { type: "powerup", value: 1, label: "power-up" },
  ],

  // ===== WATCH AD REWARD =====
  AD_WATCH_PLAYS: 1,         // 1 play per ad
  AD_WATCH_COINS: 0,         // Deprecated - use AD_WATCH_PLAYS
  AD_WATCH_EXTRA_SPINS: 2,   // Extra spins from ad

  // ===== GEM EXCHANGE =====
  GEM_TO_COINS_RATE: 500,    // 1 gem = 500 coins

  // ===== NEW PLAYER STARTING BALANCE =====
  NEW_PLAYER_COINS: 3000,    // 6 free games to learn
  NEW_PLAYER_GEMS: 3,        // 1500 coins value (3 more games)

  // ===== POWER-UP PRICES (coins) =====
  // Priced relative to 500 coin game stake
  POWER_UP_PRICES: {
    "5050": 150,         // 30% of stake - powerful ability
    "freeze": 100,       // 20% of stake
    "replace": 75,       // 15% of stake
    "time-drain": 100,   // 20% of stake
  } as Record<string, number>,

  // ===== VIP PRICES (gems) =====
  // 1 day = 30 gems = 3 GEL
  // Longer periods get better value
  VIP_PRICES: {
    day: 30,      // 30 gems = 3 GEL (base rate)
    "2days": 55,  // 55 gems — a shade under 2x day, deal-only
    week: 100,    // 100 gems = 10 GEL (52% discount vs daily)
    month: 250,   // 250 gems = 25 GEL (72% discount vs daily)
  },

  // ===== MULTIPLAYER STAKE REWARDS =====
  // Winner bonus scales with opponents actually beaten:
  //   min(WIN_COINS_PER_BEATEN × playersBeaten, 1ST_COINS cap) + own score.
  // 2nd/3rd get half their score; everyone else gets the participation
  // amount. Solo rooms are practice and pay no coins at all.
  MULTIPLAYER_1ST_COINS: 1000,        // Cap for the placement bonus
  MULTIPLAYER_WIN_COINS_PER_BEATEN: 500,
  MULTIPLAYER_2ND_COINS: 0,
  MULTIPLAYER_3RD_COINS: 0,
  MULTIPLAYER_PARTICIPATION_COINS: 100,

  // ===== FEED TRIVIA REWARDS (casual play from social feed) =====
  FEED_TRIVIA_XP_PER_CORRECT: 5,
  FEED_TRIVIA_PERFECT_XP_BONUS: 10,
  FEED_TRIVIA_COINS_PER_CORRECT: 5,      // Small coin drip
  FEED_TRIVIA_PERFECT_COINS_BONUS: 25,   // Bonus for perfect
  FEED_COLLECTION_COMPLETE_COINS: 50,    // Complete a collection

  // ===== DEPRECATED - Kept for backwards compatibility =====
  GAME_WIN_BASE_COINS: 0,
  GAME_WIN_PER_POINT_COINS: 0,
  GAME_LOSE_CONSOLATION_COINS: 0,
  GAME_DRAW_COINS: 0,
};

// Helper to get random chest coins (50-250)
export function getRandomChestCoins(): number {
  return Math.floor(Math.random() * (REWARDS.CHEST_COINS_MAX - REWARDS.CHEST_COINS_MIN + 1)) + REWARDS.CHEST_COINS_MIN;
}

// Check if today is a special day (weekend: Saturday or Sunday)
export function isSpecialDay(): boolean {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

// Get chest gems (1 on weekends, 0 otherwise)
export function getChestGems(): number {
  return isSpecialDay() ? REWARDS.CHEST_WEEKEND_GEMS : REWARDS.CHEST_GEMS;
}
