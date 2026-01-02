// Centralized reward configuration for the entire app

export const REWARDS = {
  // Solo game rewards
  GAME_WIN_BASE_COINS: 50,
  GAME_WIN_PER_POINT_COINS: 1,
  GAME_LOSE_CONSOLATION_COINS: 10,
  GAME_DRAW_COINS: 25,

  // Multiplayer rewards
  MULTIPLAYER_1ST_COINS: 100,
  MULTIPLAYER_2ND_COINS: 50,
  MULTIPLAYER_3RD_COINS: 30,
  MULTIPLAYER_PARTICIPATION_COINS: 15,

  // Level up rewards
  LEVEL_UP_COINS_PER_LEVEL: 50,
  LEVEL_UP_GEMS_THRESHOLD: 5, // Every 5 levels

  // Daily rewards (coins per day)
  DAILY_REWARDS: [
    { day: 1, coins: 50, gems: 0, xp: 10 },
    { day: 2, coins: 75, gems: 0, xp: 15 },
    { day: 3, coins: 100, gems: 1, xp: 20 },
    { day: 4, coins: 125, gems: 0, xp: 25 },
    { day: 5, coins: 150, gems: 2, xp: 30 },
    { day: 6, coins: 200, gems: 0, xp: 40 },
    { day: 7, coins: 300, gems: 5, xp: 50 },
  ],

  // Chest rewards
  CHEST_COINS: 100,
  CHEST_GEMS: 5,
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

  // Power-up prices
  POWER_UP_PRICES: {
    "5050": 150,
    "freeze": 200,
    "replace": 100,
    "time-drain": 175,
  } as Record<string, number>,
};
