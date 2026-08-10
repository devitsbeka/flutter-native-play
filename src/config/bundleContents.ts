// Single source of truth for what a shop bundle grants.
//
// The transaction log and the grant step both read this map, so what the
// receipt says and what the account receives can never drift. Coin amounts
// match the advertised descriptions/pricing in useShopData (1 gem = 500
// coins). Rotating daily/hourly deal bundles come from shopDeals.ts so the
// deal cards can't drift either.
//
// This module is deliberately free of React and Supabase: everything here is
// a pure function of the bundle id, which is what makes it testable.

import { ALL_SHOP_DEALS } from "@/config/shopDeals";

export type PowerUpKey = "5050" | "freeze" | "replace" | "time-drain";

/** The four power-ups a bundle's `powers` count applies to — N of EACH. */
export const ALL_POWER_TYPES: PowerUpKey[] = ["5050", "freeze", "replace", "time-drain"];

export interface BundleContents {
  powers: number;
  coins: number;
  gems?: number;
  vip?: "day" | "week";
}

export const BUNDLE_CONTENTS: Record<string, BundleContents> = {
  starter_bundle: { powers: 2, coins: 500 },
  starter_bundle_medium: { powers: 5, coins: 1000 },
  starter_bundle_large: { powers: 10, coins: 2500 },
  power_bundle_small: { powers: 2, coins: 0 },
  mega_power_bundle: { powers: 5, coins: 0 },
  power_bundle_large: { powers: 10, coins: 0 },
  power_combo_bundle: { powers: 3, coins: 0 },
  ...Object.fromEntries(ALL_SHOP_DEALS.map((deal) => [deal.id, deal.contents])),
};

export const isBundleId = (id: string): boolean =>
  id.includes("bundle") || id.startsWith("deal_");

/**
 * Contents for a bundle id. Unknown ids fall back to a size guess from the
 * id itself so a shop row added in the database still grants something
 * sensible rather than nothing.
 */
export const getBundleContents = (id: string): BundleContents =>
  BUNDLE_CONTENTS[id] ?? {
    powers: id.includes("small") ? 2 : id.includes("large") ? 10 : 5,
    coins: 0,
  };

/**
 * The `value_received` payload written to the transaction log for a bundle.
 * Built from the same contents the grant step uses, so the receipt always
 * describes what was actually credited.
 */
export const bundleValueReceived = (id: string): Record<string, number | string> => {
  const { powers, coins, gems = 0, vip } = getBundleContents(id);
  return {
    "5050": powers,
    freeze: powers,
    replace: powers,
    "time-drain": powers,
    ...(coins > 0 ? { coins } : {}),
    ...(gems > 0 ? { gems } : {}),
    ...(vip ? { vip_days: vip } : {}),
  };
};
