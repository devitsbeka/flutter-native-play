// Rotating shop deals — the hero row at the top of the shop.
//
// Each deal bundles powers + coins + gems at a visible discount. The DAILY
// deal rotates at local midnight, the HOURLY flash deal at the top of every
// hour; which deal is active derives from the current date/hour so every
// player sees the same offer at the same time.
//
// `contents` is the single source of truth for what a purchase grants —
// PowerUps.tsx merges these into its BUNDLE_CONTENTS map, so the card and
// the grant can't drift. `powers` means N of EACH of the 4 power-ups.
// Value math (rewardConfig): 1 power ≈ 1 gem, 500 coins = 1 gem.

export interface ShopDeal {
  id: string;
  nameKey: string;
  contents: { powers: number; coins: number; gems: number };
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
    contents: { powers: 5, coins: 2500, gems: 10 },
    wasPrice: 35, // 20 powers + 5 (coins) + 10 (gems)
    price: 24,
  },
  {
    id: "deal_daily_champion",
    nameKey: "shop.dealChampion",
    contents: { powers: 10, coins: 5000, gems: 15 },
    wasPrice: 65, // 40 powers + 10 + 15
    price: 44,
  },
  {
    id: "deal_daily_booster",
    nameKey: "shop.dealBooster",
    contents: { powers: 3, coins: 1500, gems: 5 },
    wasPrice: 20, // 12 powers + 3 + 5
    price: 14,
  },
];

// Rotates at the top of every hour: index = hourNumber % length
export const HOURLY_DEALS: ShopDeal[] = [
  {
    id: "deal_hourly_flash",
    nameKey: "shop.dealFlash",
    contents: { powers: 2, coins: 1000, gems: 3 },
    wasPrice: 13, // 8 powers + 2 + 3
    price: 7,
  },
  {
    id: "deal_hourly_blitz",
    nameKey: "shop.dealBlitz",
    contents: { powers: 3, coins: 500, gems: 4 },
    wasPrice: 17, // 12 powers + 1 + 4
    price: 9,
  },
  {
    id: "deal_hourly_rush",
    nameKey: "shop.dealRush",
    contents: { powers: 1, coins: 2000, gems: 2 },
    wasPrice: 10, // 4 powers + 4 + 2
    price: 5,
  },
];

export const ALL_SHOP_DEALS: ShopDeal[] = [...DAILY_DEALS, ...HOURLY_DEALS];
