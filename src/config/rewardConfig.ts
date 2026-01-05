// Centralized reward configuration for the entire app
// Balanced economy: 1 Gem ≈ 50 Coins
// Game stake system: 500 coins to play, winner takes all (1000 coins)

export const REWARDS = {
  // ===== GAME STAKE SYSTEM =====
  GAME_STAKE: 500,           // Entry fee per game
  GAME_WIN_REWARD: 1000,     // Winner gets stake × 2
  GAME_DRAW_REFUND: 250,     // Half stake back on draw
  GAME_LOSE_REWARD: 0,       // Loser already paid stake

  // ===== LEVEL UP REWARDS =====
  LEVEL_UP_COINS_PER_LEVEL: 100,
  LEVEL_UP_GEMS_THRESHOLD: 5, // Every 5 levels

  // ===== DAILY REWARDS - Increased for stake economy =====
  DAILY_REWARDS: [
    { day: 1, coins: 150, gems: 1 },
    { day: 2, coins: 200, gems: 1 },
    { day: 3, coins: 300, gems: 2 },
    { day: 4, coins: 400, gems: 1 },
    { day: 5, coins: 500, gems: 2 },
    { day: 6, coins: 600, gems: 2 },
    { day: 7, coins: 1000, gems: 5 },
  ],

  // ===== CHEST REWARDS (every 4 hours) =====
  CHEST_COINS: 200,
  CHEST_GEMS: 3,
  CHEST_XP: 0, // No more XP

  // ===== LUCKY SPIN REWARDS =====
  SPIN_REWARDS: [
    { type: "coins", value: 100, label: "100 მონეტა" },
    { type: "coins", value: 250, label: "250 მონეტა" },
    { type: "coins", value: 500, label: "500 მონეტა" },
    { type: "gems", value: 1, label: "1 ალმასი" },
    { type: "gems", value: 3, label: "3 ალმასი" },
    { type: "coins", value: 150, label: "150 მონეტა" },
    { type: "coins", value: 300, label: "300 მონეტა" },
    { type: "powerup", value: 1, label: "ძალა" },
  ],

  // ===== WATCH AD REWARD =====
  AD_WATCH_COINS: 1000,

  // ===== GEM EXCHANGE =====
  GEM_TO_COINS_RATE: 50, // 1 gem = 50 coins

  // ===== NEW PLAYER STARTING BALANCE =====
  NEW_PLAYER_COINS: 2000, // 4 free games to learn
  NEW_PLAYER_GEMS: 10,

  // ===== POWER-UP PRICES (coins) =====
  POWER_UP_PRICES: {
    "5050": 100,
    "freeze": 120,
    "replace": 80,
    "time-drain": 100,
  } as Record<string, number>,

  // ===== MULTIPLAYER STAKE REWARDS =====
  MULTIPLAYER_1ST_COINS: 1000,  // Winner takes all
  MULTIPLAYER_2ND_COINS: 0,
  MULTIPLAYER_3RD_COINS: 0,
  MULTIPLAYER_PARTICIPATION_COINS: 0,

  // ===== DEPRECATED - Kept for backwards compatibility =====
  // These are no longer used in the stake system
  GAME_WIN_BASE_COINS: 0,
  GAME_WIN_PER_POINT_COINS: 0,
  GAME_LOSE_CONSOLATION_COINS: 0,
  GAME_DRAW_COINS: 0,
};
