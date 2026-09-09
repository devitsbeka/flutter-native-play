/**
 * What a bundle's contents would cost bought some other way.
 *
 * Every "-22%" badge in the shop is a claim about a price the player could
 * otherwise have paid, and until now those claims were written by hand against
 * a list rate — 1 gem per power, 1 gem per 500 coins. That rate is real (the
 * single-power packs and the 500-coin pack do sell at it), but it is not the
 * cheapest route, and the shop undercut it two sections down:
 *
 *   starter_bundle sold 8 powers + 500 coins for 10 gems and called itself a
 *   starter deal. power_bundle_small sells those 8 powers for 7, and
 *   coins_500 sells those coins for 1. The "deal" cost 25% MORE than
 *   assembling it from the same shop, and two of its three siblings wore a
 *   discount badge while doing the same thing.
 *
 * So the reference price is computed here instead, and computed the way a
 * shopper would actually shop: the cheapest combination of OTHER catalogue
 * items that delivers at least the same contents. Not a linear rate — a rate
 * implies you can buy 8 powers at the 40-power price, and you cannot. Small
 * packs having a worse unit price is normal and is not what this is looking
 * for; paying more in total for no more goods is.
 *
 * `excludeId` is what keeps it honest and non-circular: an item is never its
 * own reference price. Without it `power_bundle_large` would define the rate
 * it is then measured against and score a permanent 0%.
 *
 * The ladders below are also the single definition of the coin and power packs
 * the shop sells — useShopData builds its rows from them, so a price cannot be
 * changed in the grid without moving the reference every badge is measured
 * against.
 */

import { REWARDS } from "@/config/rewardConfig";

/** A bundle's `powers: N` means N of EACH type, and there are four. */
export const POWER_TYPE_COUNT = 4;

export interface CoinPack {
  id: string;
  coins: number;
  gems: number;
}

/**
 * Coin packs, cheapest first.
 *
 * The larger two pay a bonus over the 500-coins-per-gem base rate (555 and 625
 * coins per gem). That bonus is only safe because `exchange_currency` sells
 * coins back at a WORSE rate than it buys them — see the spread in
 * supabase/migrations/20261104110000_shop_purchase_and_exchange_spread.sql.
 * With a lossless 1:1 exchange, any bonus above zero here was a gem printer:
 * 24 gems bought 15 000 coins which exchanged back to 30.
 */
export const COIN_PACKS: readonly CoinPack[] = [
  { id: "coins_500", coins: 500, gems: 1 },
  { id: "coins_1500", coins: 1500, gems: 3 },
  { id: "coins_5000", coins: 5000, gems: 9 },
  { id: "coins_15000", coins: 15000, gems: 24 },
] as const;

export interface PowerBundle {
  id: string;
  /** N of EACH of the four types. */
  powers: number;
  gems: number;
}

/** Bundles that deliver powers and nothing else. */
export const POWER_BUNDLES: readonly PowerBundle[] = [
  { id: "power_bundle_small", powers: 2, gems: 7 },
  { id: "power_bundle_large", powers: 10, gems: 28 },
] as const;

/** The single-type pack: three of one power, at the list rate of a gem each. */
export const SINGLE_POWER_PACK = { count: 3, gems: 3 } as const;

/**
 * What one power costs at the list rate — the price of the smallest purchase
 * that sells powers, per power.
 *
 * The Mega Powers bundles quote their discount against this, and that claim is
 * sound: the single-type packs really do sell three powers for three gems, in
 * exactly that quantity. It is the STARTER packs that could not use it,
 * because the thing they are really competing with is the bundle two rows
 * down — hence `cheapestAlternativeGems` below.
 */
export const GEMS_PER_POWER_LIST = SINGLE_POWER_PACK.gems / SINGLE_POWER_PACK.count;

/** Coins per gem at the base rate, which is also the gem→coin exchange rate. */
export const COINS_PER_GEM_LIST = COIN_PACKS[0].coins / COIN_PACKS[0].gems;

export interface BundleContentsLike {
  /** N of each of the four power types. */
  powers: number;
  coins: number;
  vip?: "day" | "2days" | "week" | "month";
}

/**
 * Cheapest gem cost of covering `n` of EVERY power type.
 *
 * A small unbounded-cover search rather than a rate, for the reason in the
 * header: buying 40 powers to cover 8 is not a price anybody pays. Memoised
 * downwards; the catalogue is three sources deep and `n` never exceeds ten.
 */
function minPowerCost(n: number, bundles: readonly PowerBundle[]): number {
  if (n <= 0) return 0;

  // All singles: ceil(n/3) packs of each of the four types.
  let best = POWER_TYPE_COUNT * Math.ceil(n / SINGLE_POWER_PACK.count) * SINGLE_POWER_PACK.gems;

  for (const bundle of bundles) {
    const cost = bundle.gems + minPowerCost(n - bundle.powers, bundles);
    if (cost < best) best = cost;
  }

  return best;
}

/** Cheapest gem cost of at least `coins` coins, from whole packs. */
function minCoinCost(coins: number, packs: readonly CoinPack[]): number {
  if (coins <= 0) return 0;
  if (packs.length === 0) return Number.POSITIVE_INFINITY;

  let best = Number.POSITIVE_INFINITY;
  for (const pack of packs) {
    const cost = pack.gems + minCoinCost(coins - pack.coins, packs);
    if (cost < best) best = cost;
  }
  return best;
}

/**
 * What these contents cost assembled from the rest of the catalogue.
 *
 * This is the number a savings badge is measured against, and the number every
 * bundle must sell below. VIP is priced at its own shop row — there is only
 * one way to buy a week of PRO with gems, so it is its own cheapest route.
 */
export function cheapestAlternativeGems(
  contents: BundleContentsLike,
  excludeId?: string,
): number {
  const bundles = POWER_BUNDLES.filter((b) => b.id !== excludeId);
  const packs = COIN_PACKS.filter((p) => p.id !== excludeId);

  const vip = contents.vip ? REWARDS.VIP_PRICES[contents.vip] : 0;
  return minPowerCost(contents.powers, bundles) + minCoinCost(contents.coins, packs) + vip;
}

/**
 * The price to sell these contents at, for a given discount.
 *
 * Deals and bundles declare a discount rather than a price, so the price moves
 * when the reference does. That is not tidiness: VIP gem prices changed by
 * 2.28x when the lari rate was unified, and every deal carrying PRO time had a
 * hand-written price that would otherwise have gone on selling a 230-gem week
 * for 69 gems.
 *
 * Rounded to a whole gem, and never allowed to land on or above the reference
 * — a "deal" at full price is the bug this module exists to make impossible.
 */
export function discountedPrice(reference: number, discountPercent: number): number {
  const price = Math.round(reference * (1 - discountPercent / 100));
  return Math.max(1, Math.min(price, Math.floor(reference) - 1));
}

/** A bundle the shop sells for gems, with both prices worked out. */
export interface PricedBundle {
  id: string;
  contents: BundleContentsLike;
  /** Cheapest the same contents can be assembled for elsewhere in the shop. */
  wasPrice: number;
  price: number;
  savings: number;
}

function price(id: string, contents: BundleContentsLike, discountPercent: number): PricedBundle {
  const wasPrice = cheapestAlternativeGems(contents, id);
  const p = discountedPrice(wasPrice, discountPercent);
  return { id, contents, wasPrice, price: p, savings: Math.round((1 - p / wasPrice) * 100) };
}

/** How much a starter pack undercuts assembling the same contents. */
export const STARTER_BUNDLE_DISCOUNT = 25;

/**
 * The three starter packs, priced rather than hand-written.
 *
 * They live here rather than in useShopData because useShopData is a React
 * hook and nothing that owns a price should need React to be tested. These
 * three were 10 / 20 / 35 gems against contents the same shop assembled for
 * 8 / 21 / 33, so the "starter deal" cost more than its own parts and two of
 * the three advertised a discount while doing it.
 */
export const STARTER_BUNDLES: readonly PricedBundle[] = [
  price("starter_bundle", { powers: 2, coins: 500 }, STARTER_BUNDLE_DISCOUNT),
  price("starter_bundle_medium", { powers: 5, coins: 1000 }, STARTER_BUNDLE_DISCOUNT),
  price("starter_bundle_large", { powers: 10, coins: 2500 }, STARTER_BUNDLE_DISCOUNT),
] as const;
