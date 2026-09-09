// Centralized reward configuration for the entire app
// 
// ECONOMY BALANCE:
// - 1 Gem = 500 Coins
// - Game stake: 500 coins (win = 1000, lose = 0, draw = 250)
// - New player gets 5000 coins (10 free games) + 3 gems (1500 coins value)
//
// No lari figures here. Gem prices are global and money prices are not, so a
// line like "30 gems = 3 GEL" is only true in one market and only until the
// ladder moves — which is exactly what happened to the one that used to be
// here: it stated a "1 GEL = 10 gems" anchor the packs had drifted 5x from.
// The money side lives in src/config/pricing.ts alone.

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
  //
  // NOT the source of truth, and the only entry here that is not: the
  // database pays this one. claim_daily_reward carries the ladder itself
  // (supabase/migrations/20260913100000_daily_reward_ladder.sql) and returns
  // a receipt, which is what the modal shows — so no screen ever reads these
  // numbers, and they had drifted to 200/300/400/500/750/1000/1500 without
  // anything noticing.
  //
  // Kept, and corrected to the ladder that actually pays, because the admin
  // economy screen states it and a number nobody reads is exactly the kind
  // that ends up on a marketing page. Change it HERE and it changes nothing;
  // change the migration.
  //
  // The gems land on days 3, 5 and 7. On top of all of it the function rolls
  // a surprise — doubled coins, gems, or a power-up, weighted further towards
  // power-ups as the streak grows.
  DAILY_REWARDS: [
    { day: 1, coins: 50, gems: 0 },
    { day: 2, coins: 75, gems: 0 },
    { day: 3, coins: 100, gems: 1 },
    { day: 4, coins: 125, gems: 0 },
    { day: 5, coins: 150, gems: 2 },
    { day: 6, coins: 200, gems: 0 },
    { day: 7, coins: 300, gems: 5 },
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
  // Mirrored by the DEFAULT on profiles.coins/gems, which is what actually
  // grants it, and by economy_config's new_player_* rows, which the admin
  // economy screen reads. All three are set together — see
  // supabase/migrations/20261102100000_starting_balance_and_pro_welcome.sql.
  NEW_PLAYER_COINS: 5000,    // 10 free games to learn
  NEW_PLAYER_GEMS: 3,        // 1500 coins value (3 more games)

  // ===== WHAT A SUBSCRIPTION OPENS WITH =====
  //
  // A welcome bundle, once per tier per person, credited by the store sync
  // when the subscription first lands (supabase/functions/_shared/iap.ts).
  // PRO's benefit is unlimited plays; it does not waive a room stake — the
  // pot is other players' money — so the bundle is what makes the first
  // weeks of a subscription feel paid for.
  PRO_WELCOME: {
    pro: { coins: 25000, gems: 10 },       // PRO, one seat
    pro_plus: { coins: 50000, gems: 20 },  // Friends PRO, six seats
  } as Record<"pro" | "pro_plus", { coins: number; gems: number }>,

  // ===== POWER-UP PRICES (coins) =====
  // Priced relative to 500 coin game stake
  POWER_UP_PRICES: {
    "5050": 150,         // 30% of stake - powerful ability
    "freeze": 100,       // 20% of stake
    "replace": 75,       // 15% of stake
    "time-drain": 100,   // 20% of stake
  } as Record<string, number>,

  // ===== VIP PRICES (gems) =====
  //
  // Priced so that buying PRO with gems costs what the SUBSCRIPTION costs, in
  // every currency. That is the whole reason these numbers are what they are,
  // and it is not obvious from looking at them:
  //
  //   month = 570 gems. At the best pack rate that is $3.99 and 4.99 GEL —
  //   exactly `pro_monthly` in src/config/pricing.ts.
  //
  // They were 30/55/100/250, which worked out at 4.81 GEL for a month (fine)
  // and $1.75 (not fine — the subscription is $3.99). The gem route was 56%
  // off PRO for everyone outside Georgia, with no renewal and no trial
  // attached. That gap was really the two lari rates showing through; see the
  // long note on PRICES, which is the other half of this fix. The two move
  // TOGETHER or the gap reopens.
  //
  // The old comments claimed "1 day = 30 gems = 3 GEL", from a "1 GEL = 10
  // gems" anchor the ladder had drifted 5x away from. Deliberately no
  // money figures here now: the gem price is global, the money price is not,
  // and writing one next to the other is how the last set went stale.
  //
  // Longer periods still get better value: 70, 62.5, 32.9, 19 gems per day.
  VIP_PRICES: {
    day: 70,
    "2days": 125,  // a shade under 2x day, deal-only
    week: 230,
    month: 570,
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
//
// Uniform: every whole number in the range is equally likely, which is what
// `ChestRewardModal` discloses. App Store guideline 3.1.1 asks a randomised
// reward to publish its odds, and the chest is randomised — so if the
// distribution is ever weighted, the disclosure has to change with it.
export function getRandomChestCoins(): number {
  return Math.floor(Math.random() * (REWARDS.CHEST_COINS_MAX - REWARDS.CHEST_COINS_MIN + 1)) + REWARDS.CHEST_COINS_MIN;
}

/** How many distinct coin amounts the chest can pay. */
export const CHEST_COIN_OUTCOMES =
  REWARDS.CHEST_COINS_MAX - REWARDS.CHEST_COINS_MIN + 1;

/** The chance of any one of them, as a percentage. */
export const CHEST_COIN_CHANCE_PERCENT = 100 / CHEST_COIN_OUTCOMES;

// Check if today is a special day (weekend: Saturday or Sunday)
export function isSpecialDay(): boolean {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

// Get chest gems (1 on weekends, 0 otherwise)
export function getChestGems(): number {
  return isSpecialDay() ? REWARDS.CHEST_WEEKEND_GEMS : REWARDS.CHEST_GEMS;
}
