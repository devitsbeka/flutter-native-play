/**
 * The gem packs the shop sells, and the store products that back them.
 *
 * One list, because a pack has to be known in four places that had all
 * drifted apart: the `/power-ups` shop grid, the "not enough gems" modal, the
 * Stripe checkout on web, and the App Store product catalog on native.
 *
 * The two client surfaces used to carry **different ladders**. The shop sold
 * 30/100/300/700 at $1.19–$19.99; the modal sold 100/500/1500/5000 at
 * $0.79–$23.99 — four to eight times more gems per dollar. A month of VIP
 * costs 250 gems, which was about $9 through the shop and about $2 through
 * the modal. The shop's ladder is the designed one: `useShopData` prices the
 * rest of the economy against "1 GEL = 10 gems", and only the shop ladder
 * holds to it.
 *
 * On native the mismatch was worse than a price difference. The store SKU was
 * looked up by gem count, and only the modal's counts were mapped, so three of
 * the shop's four packs resolved to nothing and showed "unavailable" — while
 * the fourth advertised 111 gems and credited 100. The lookup is keyed by pack
 * **id** now: both surfaces already carry `gems_30`-style ids, and a count is
 * exactly the thing that changes when a bonus is added.
 *
 * `gems` is the **total credited** — base plus bonus, the number the card
 * promises. That distinction is not cosmetic: the shop advertised "700 +200"
 * and passed `value: 700` to checkout, so the bonus was never granted on any
 * platform. Selling that on the App Store would be advertising 900 and
 * delivering 700.
 *
 * Adding a pack means adding it here, creating the matching consumable in App
 * Store Connect and RevenueCat, and adding it to PRODUCTS in
 * supabase/functions/_shared/iap.ts, which decides how many gems it grants.
 * `src/__tests__/repo-invariants.test.ts` fails if those two disagree.
 */

export interface GemPack {
  /** Internal id, also the Stripe product reference on web. */
  id: string;
  /** The headline number on the card. */
  baseGems: number;
  /** The "+N" advertised alongside it. Zero for packs without a bonus. */
  bonusGems: number;
  /** Total credited on purchase — what the card actually promises. */
  gems: number;
  priceUsd: number;
  /** Display label, e.g. "700 +200". */
  name: string;
  /** Discount badge percentage shown on the card, if any. */
  bonus?: number;
  /** App Store / Play consumable id. */
  productId: string;
}

export const GEM_PACKS: GemPack[] = [
  {
    id: "gems_30",
    baseGems: 30,
    bonusGems: 0,
    gems: 30,
    priceUsd: 1.19,
    name: "30",
    productId: "io.mytrivia.gems.30",
  },
  {
    id: "gems_100",
    baseGems: 100,
    bonusGems: 11,
    gems: 111,
    priceUsd: 3.59,
    name: "100 +11",
    bonus: 11,
    productId: "io.mytrivia.gems.100",
  },
  {
    id: "gems_300",
    baseGems: 300,
    bonusGems: 60,
    gems: 360,
    priceUsd: 9.99,
    name: "300 +60",
    bonus: 20,
    productId: "io.mytrivia.gems.300",
  },
  {
    id: "gems_700",
    baseGems: 700,
    bonusGems: 200,
    gems: 900,
    priceUsd: 19.99,
    name: "700 +200",
    bonus: 40,
    productId: "io.mytrivia.gems.700",
  },
];

/**
 * Pack id → store product id, for the native purchase path.
 *
 * Keyed by id rather than gem count. The count is derived from base + bonus,
 * so keying on it meant that adding a bonus to a pack silently unmapped its
 * SKU and the purchase failed with "this pack is currently unavailable".
 */
export const GEM_PACK_PRODUCTS: Record<string, string> = Object.fromEntries(
  GEM_PACKS.map((p) => [p.id, p.productId]),
);
