// Rotating shop deals — the hero banner row at the top of the shop.
//
// Each deal bundles PRO (VIP) time + powers + coins at a visible discount —
// no raw gems, the currency users buy the deal WITH. The DAILY deal rotates
// at local midnight, the HOURLY flash deal at the top of every hour; which
// deal is active derives from the current date/hour so every player sees the
// same offer at the same time.
//
// `contents` is the single source of truth for what a purchase grants —
// bundleContents.ts merges these into its BUNDLE_CONTENTS map, so the card and
// the grant can't drift.  `powers` means N of EACH of the 4 power-ups.
//
// **A deal declares a DISCOUNT, not a price.** Both `wasPrice` and `price` are
// computed from `contents` by src/config/shopValue.ts. Two reasons, and the
// first one already bit:
//
//   1. The hand-written `wasPrice` comments valued powers at the 1-gem list
//      rate ("100 + 40 + 10") while the shop sold those same 40 powers for 28
//      in the Mega Powers section. Every advertised percentage was a few
//      points higher than the real one.
//   2. VIP gem prices moved 2.28x when the lari rate was unified (see
//      REWARDS.VIP_PRICES). Every hand-written price here would have gone on
//      selling a 230-gem week of PRO for 69 gems — a 70% discount nobody
//      decided on, permanently available, on the rotation.
//
// The discount is the SAME on every deal on purpose. The rotation only decides
// which one is on the screen, and nothing stops a player buying an
// out-of-rotation deal by id, so deals of differing value would just mean
// always buying the best one. Variety is in what the deals contain, not in how
// good a price they are.

import { cheapestAlternativeGems, discountedPrice } from "@/config/shopValue";

/** Every deal is sold at this discount off the cheapest alternative route. */
export const DEAL_DISCOUNT_PERCENT = 40;

export type DealVip = "day" | "2days" | "week";

export interface ShopDeal {
  id: string;
  nameKey: string;
  contents: { powers: number; coins: number; vip?: DealVip };
  /** Cheapest these contents can be had for elsewhere in the shop, in gems. */
  wasPrice: number;
  /** Discounted deal price in gems. */
  price: number;
}

/** What a deal declares. The two prices are derived from it. */
interface DealSpec {
  id: string;
  nameKey: string;
  contents: { powers: number; coins: number; vip?: DealVip };
}

const priced = (spec: DealSpec): ShopDeal => {
  const wasPrice = cheapestAlternativeGems(spec.contents, spec.id);
  return {
    ...spec,
    wasPrice,
    price: discountedPrice(wasPrice, DEAL_DISCOUNT_PERCENT),
  };
};

export const dealSavings = (deal: ShopDeal): number =>
  Math.round((1 - deal.price / deal.wasPrice) * 100);

// Rotates at local midnight: index = dayNumber % length
export const DAILY_DEALS: ShopDeal[] = ([
  {
    id: "deal_daily_royal",
    nameKey: "shop.dealRoyal",
    contents: { powers: 5, coins: 2500, vip: "week" },
  },
  {
    id: "deal_daily_champion",
    nameKey: "shop.dealChampion",
    contents: { powers: 10, coins: 5000, vip: "week" },
  },
  // Two-day PRO, and the reason the rotation is worth watching: a day is gone
  // by tomorrow, two carries a weekend.
  //
  // This was an HOURLY deal and swapped places with the booster below when VIP
  // was repriced against the subscription. The rotations are meant to differ
  // in size — an hourly is an impulse, a daily is a commitment — and once two
  // days of PRO cost 125 gems rather than 55, the two-day deal was the
  // dearest thing in the shop's cheap rotation while the one-day deal sat in
  // its expensive one. Nothing about either offer changed; they are in the
  // rotation that matches what they cost.
  {
    id: "deal_hourly_duo",
    nameKey: "shop.dealDuo",
    contents: { powers: 1, coins: 500, vip: "2days" },
  },
] as DealSpec[]).map(priced);

// Rotates at the top of every hour: index = hourNumber % length
export const HOURLY_DEALS: ShopDeal[] = ([
  {
    id: "deal_hourly_flash",
    nameKey: "shop.dealFlash",
    contents: { powers: 2, coins: 1000, vip: "day" },
  },
  {
    id: "deal_hourly_blitz",
    nameKey: "shop.dealBlitz",
    contents: { powers: 3, coins: 500, vip: "day" },
  },
  {
    id: "deal_hourly_rush",
    nameKey: "shop.dealRush",
    contents: { powers: 1, coins: 2000, vip: "day" },
  },
  // Powers-heavy, for someone who is losing rounds rather than short of time.
  {
    id: "deal_hourly_arsenal",
    nameKey: "shop.dealArsenal",
    contents: { powers: 5, coins: 500, vip: "day" },
  },
  // Coins-heavy, the other way round.
  {
    id: "deal_hourly_vault",
    nameKey: "shop.dealVault",
    contents: { powers: 1, coins: 3000, vip: "day" },
  },
  // One day of PRO — the impulse end of the ladder. Was a daily deal; see the
  // note on deal_hourly_duo.
  {
    id: "deal_daily_booster",
    nameKey: "shop.dealBooster",
    contents: { powers: 3, coins: 1500, vip: "day" },
  },
] as DealSpec[]).map(priced);

export const ALL_SHOP_DEALS: ShopDeal[] = [...DAILY_DEALS, ...HOURLY_DEALS];
