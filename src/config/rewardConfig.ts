// Centralized reward configuration for the entire app
// Balanced economy: 1 Gem ≈ 50 Coins

export const REWARDS = {
  // Solo game rewards (increased slightly)
  GAME_WIN_BASE_COINS: 60,
  GAME_WIN_PER_POINT_COINS: 2,
  GAME_LOSE_CONSOLATION_COINS: 15,
  GAME_DRAW_COINS: 30,

  // Multiplayer rewards (increased)
  MULTIPLAYER_1ST_COINS: 120,
  MULTIPLAYER_2ND_COINS: 60,
  MULTIPLAYER_3RD_COINS: 35,
  MULTIPLAYER_PARTICIPATION_COINS: 20,

  // Level up rewards
  LEVEL_UP_COINS_PER_LEVEL: 50,
  LEVEL_UP_GEMS_THRESHOLD: 5, // Every 5 levels

  // Daily rewards - gems on every day for engagement
  DAILY_REWARDS: [
    { day: 1, coins: 50, gems: 1, xp: 10 },
    { day: 2, coins: 75, gems: 1, xp: 15 },
    { day: 3, coins: 100, gems: 2, xp: 20 },
    { day: 4, coins: 125, gems: 1, xp: 25 },
    { day: 5, coins: 150, gems: 2, xp: 30 },
    { day: 6, coins: 200, gems: 2, xp: 40 },
    { day: 7, coins: 350, gems: 5, xp: 50 },
  ],

  // Chest rewards (every 4 hours instead of 6)
  CHEST_COINS: 80,
  CHEST_GEMS: 3,
  CHEST_XP: 50,

  // Lucky spin rewards
  SPIN_REWARDS: [
    { type: "coins", value: 50, label: "50 მონეტა" },
    { type: "coins", value: 100, label: "100 მონეტა" },
    { type: "coins", value: 200, label: "200 მონეტა" },
    { type: "gems", value: 1, label: "1 ალმასი" },
    { type: "gems", value: 3, label: "3 ალმასი" },
    { type: "xp", value: 50, label: "50 XP" },
    { type: "xp", value: 100, label: "100 XP" },
    { type: "powerup", value: 1, label: "ძალა" },
  ],

  // Power-up prices (coins) - balanced for 1-2 games = 1 power-up
  POWER_UP_PRICES: {
    "5050": 100,
    "freeze": 120,
    "replace": 80,
    "time-drain": 100,
  } as Record<string, number>,
};
