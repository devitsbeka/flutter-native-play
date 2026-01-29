// Centralized reward configuration for the entire app
// Balanced economy: 1 Gem ≈ 50 Coins
// Game stake system: 500 coins to play, winner takes all (1000 coins)

export const REWARDS = {
  // ===== GAME STAKE SYSTEM =====
  GAME_STAKE: 500,           // Entry fee per game
  GAME_WIN_REWARD: 1000,     // Winner gets stake × 2
  GAME_DRAW_REFUND: 250,     // Half stake back on draw
  GAME_LOSE_REWARD: 0,       // Loser already paid stake

  // ===== PLAY REGENERATION SYSTEM =====
  PLAY_REGEN_HOURS: 4,       // 1 play every 4 hours after daily limit
  PLAY_REGEN_MAX: 3,         // Max stored regenerated plays
  PLAYS_PER_AD: 1,           // 1 play per ad (not coins)
  MAX_ADS_PER_DAY: 5,        // Limit ad watching per day
  GEMS_FOR_PLAYS: 3,         // 3 gems = instant plays
  GEMS_PLAYS_AMOUNT: 2,      // Number of plays for gems

  // ===== LEVEL UP REWARDS =====
  LEVEL_UP_COINS_PER_LEVEL: 75,  // Reduced from 100
  LEVEL_UP_GEMS_THRESHOLD: 5,    // Every 5 levels

  // ===== DAILY REWARDS - Balanced for sustainable economy =====
  DAILY_REWARDS: [
    { day: 1, coins: 100, gems: 0 },
    { day: 2, coins: 150, gems: 0 },
    { day: 3, coins: 200, gems: 1 },
    { day: 4, coins: 250, gems: 0 },
    { day: 5, coins: 350, gems: 1 },
    { day: 6, coins: 450, gems: 1 },
    { day: 7, coins: 500, gems: 2 },
  ],

  // ===== CHEST REWARDS (every 6 hours) =====
  CHEST_COINS: 100,          // Reduced from 200
  CHEST_GEMS: 1,             // Reduced from 3
  CHEST_COOLDOWN_HOURS: 6,   // Increased from 4
  CHEST_XP: 0,               // No more XP

  // ===== LUCKY SPIN REWARDS - Balanced =====
  SPIN_REWARDS: [
    { type: "coins", value: 50, label: "50 მონეტა" },
    { type: "coins", value: 100, label: "100 მონეტა" },
    { type: "coins", value: 200, label: "200 მონეტა" },
    { type: "coins", value: 300, label: "300 მონეტა" },
    { type: "gems", value: 1, label: "1 ალმასი" },
    { type: "gems", value: 2, label: "2 ალმასი" },
    { type: "coins", value: 75, label: "75 მონეტა" },
    { type: "powerup", value: 1, label: "ძალა" },
  ],

  // ===== WATCH AD REWARD - Now gives plays, not coins =====
  AD_WATCH_PLAYS: 1,         // 1 play per ad
  AD_WATCH_COINS: 0,         // Deprecated - use AD_WATCH_PLAYS
  AD_WATCH_EXTRA_SPINS: 3,   // Reduced from 5

  // ===== GEM EXCHANGE =====
  GEM_TO_COINS_RATE: 50,     // 1 gem = 50 coins

  // ===== NEW PLAYER STARTING BALANCE - Reduced =====
  NEW_PLAYER_COINS: 1500,    // 3 free games to learn (was 2000)
  NEW_PLAYER_GEMS: 5,        // Reduced from 10

  // ===== POWER-UP PRICES (coins) =====
  POWER_UP_PRICES: {
    "5050": 100,
    "freeze": 120,
    "replace": 80,
    "time-drain": 100,
  } as Record<string, number>,

  // ===== VIP PRICES (gems) =====
  VIP_PRICES: {
    day: 5,      // Increased from 3
    week: 20,    // Increased from 12
    month: 50,   // Increased from 35
  },

  // ===== MULTIPLAYER STAKE REWARDS =====
  MULTIPLAYER_1ST_COINS: 1000,  // Winner takes all
  MULTIPLAYER_2ND_COINS: 0,
  MULTIPLAYER_3RD_COINS: 0,
  MULTIPLAYER_PARTICIPATION_COINS: 0,

  // ===== FEED TRIVIA REWARDS (casual play from social feed) =====
  FEED_TRIVIA_XP_PER_CORRECT: 5,
  FEED_TRIVIA_PERFECT_XP_BONUS: 10,
  FEED_TRIVIA_COINS_PER_CORRECT: 2,
  FEED_TRIVIA_PERFECT_COINS_BONUS: 10,
  FEED_COLLECTION_COMPLETE_COINS: 15,

  // ===== DEPRECATED - Kept for backwards compatibility =====
  GAME_WIN_BASE_COINS: 0,
  GAME_WIN_PER_POINT_COINS: 0,
  GAME_LOSE_CONSOLATION_COINS: 0,
  GAME_DRAW_COINS: 0,
};
