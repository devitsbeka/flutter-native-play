/**
 * The gem packs the shop sells, and the store products that back them.
 *
 * One list, because there are now two places a pack has to be known: the web
 * shop (which sends the pack to Stripe) and the native shop (which has to
 * name an App Store product id). When those two drifted apart, a pack with no
 * store SKU on iOS would have had nowhere to go — and the tempting fix is the
 * one that gets the build rejected under guideline 3.1.1.
 *
 * Adding a pack means adding its `productId` here, creating the matching
 * consumable in App Store Connect and RevenueCat, and adding it to PRODUCTS
 * in supabase/functions/_shared/iap.ts, which decides how many gems it grants.
 */

export interface GemPack {
  /** Internal id, also the Stripe product reference on web. */
  id: string;
  gems: number;
  priceUsd: number;
  /** Display label. */
  name: string;
  /** Bonus percentage advertised on the pack, if any. */
  bonus?: number;
  /** App Store / Play consumable id. */
  productId: string;
}

export const GEM_PACKS: GemPack[] = [
  { id: "gems_100", gems: 100, priceUsd: 0.79, name: "100", productId: "io.mytrivia.gems.100" },
  { id: "gems_500", gems: 500, priceUsd: 3.19, name: "500", productId: "io.mytrivia.gems.500" },
  { id: "gems_1500", gems: 1500, priceUsd: 7.99, name: "1500", bonus: 20, productId: "io.mytrivia.gems.1500" },
  { id: "gems_5000", gems: 5000, priceUsd: 23.99, name: "5000", bonus: 40, productId: "io.mytrivia.gems.5000" },
];

/** Gem count → store product id, for the native purchase path. */
export const GEM_PACK_PRODUCTS: Record<number, string> = Object.fromEntries(
  GEM_PACKS.map((pack) => [pack.gems, pack.productId]),
);
