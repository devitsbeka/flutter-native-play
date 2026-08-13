// Rotating shop deals — the hero banner row at the top of the shop.
//
// Each deal bundles PRO (VIP) time + powers + coins at a visible discount —
// no raw gems, the currency users buy the deal WITH. The DAILY deal rotates
// at local midnight, the HOURLY flash deal at the top of every hour; which
// deal is active derives from the current date/hour so every player sees the
// same offer at the same time.
//
// `contents` is the single source of truth for what a purchase grants —
// PowerUps.tsx merges these into its BUNDLE_CONTENTS map, so the card and
// the grant can't drift. `powers` means N of EACH of the 4 power-ups.
// Value math (rewardConfig): 1 power ≈ 1 gem, 500 coins = 1 gem,
// VIP day = 30 gems, VIP 2 days = 55 gems, VIP week = 100 gems.
//
// Every deal carries PRO time. The banner draws three fixed tiles — PRO,
// powers, coins — so a deal without it would leave the first tile claiming
// something the purchase does not grant.

export type DealVip = "day" | "2days" | "week";

export interface ShopDeal {
  id: string;
  nameKey: string;
  contents: { powers: number; coins: number; vip?: DealVip };
  /** Full price in gems — what the same contents cost bought separately. */
  wasPrice: number;
  /** Discounted deal price in gems. */
  price: number;
}

export const dealSavings = (deal: ShopDeal): number =>
  Math.round((1 - deal.price / deal.wasPrice) * 100);

// Rotates at local midnight: index = dayNumber % length
export const DAILY_DEALS: ShopDeal[] = [
  {
    id: "deal_daily_royal",
    nameKey: "shop.dealRoyal",
    contents: { powers: 5, coins: 2500, vip: "week" },
    wasPrice: 125, // 100 (VIP week) + 20 powers + 5 (coins)
    price: 69,
  },
  {
    id: "deal_daily_champion",
    nameKey: "shop.dealChampion",
    contents: { powers: 10, coins: 5000, vip: "week" },
    wasPrice: 150, // 100 + 40 + 10
    price: 89,
  },
  {
    id: "deal_daily_booster",
    nameKey: "shop.dealBooster",
    contents: { powers: 3, coins: 1500, vip: "day" },
    wasPrice: 45, // 30 (VIP day) + 12 + 3
    price: 25,
  },
];

// Rotates at the top of every hour: index = hourNumber % length
export const HOURLY_DEALS: ShopDeal[] = [
  {
    id: "deal_hourly_flash",
    nameKey: "shop.dealFlash",
    contents: { powers: 2, coins: 1000, vip: "day" },
    wasPrice: 40, // 30 + 8 + 2
    price: 19,
  },
  {
    id: "deal_hourly_blitz",
    nameKey: "shop.dealBlitz",
    contents: { powers: 3, coins: 500, vip: "day" },
    wasPrice: 43, // 30 + 12 + 1
    price: 21,
  },
  {
    id: "deal_hourly_rush",
    nameKey: "shop.dealRush",
    contents: { powers: 1, coins: 2000, vip: "day" },
    wasPrice: 38, // 30 + 4 + 4
    price: 18,
  },
  // Two-day PRO: the reason the rotation is worth watching. A day is gone
  // by tomorrow; two carries a weekend.
  {
    id: "deal_hourly_duo",
    nameKey: "shop.dealDuo",
    contents: { powers: 1, coins: 500, vip: "2days" },
    wasPrice: 60, // 55 (VIP 2 days) + 4 + 1
    price: 24,
  },
  // Powers-heavy, for someone who is losing rounds rather than short of time.
  {
    id: "deal_hourly_arsenal",
    nameKey: "shop.dealArsenal",
    contents: { powers: 5, coins: 500, vip: "day" },
    wasPrice: 51, // 30 + 20 + 1
    price: 23,
  },
  // Coins-heavy, the other way round.
  {
    id: "deal_hourly_vault",
    nameKey: "shop.dealVault",
    contents: { powers: 1, coins: 3000, vip: "day" },
    wasPrice: 40, // 30 + 4 + 6
    price: 19,
  },
];

export const ALL_SHOP_DEALS: ShopDeal[] = [...DAILY_DEALS, ...HOURLY_DEALS];
