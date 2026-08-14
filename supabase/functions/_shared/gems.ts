/**
 * The gem packs, server-side.
 *
 * The web checkout used to take `gems` and `priceGel` straight off the request
 * body, put the price into the Stripe line item and the gem count into session
 * metadata, and the webhook credited whatever metadata said. A signed-in user
 * could name both — any number of gems, for any price they liked.
 *
 * So this file exists for the same reason `iap.ts` does: **the client names a
 * product, the server decides what that costs and what it grants.** Nothing
 * about quantity or price is read from the request.
 *
 * Mirrors `src/config/gemPacks.ts`, which drives the two client surfaces, and
 * `PRODUCTS` in `iap.ts`, which resolves the App Store side of the same packs.
 * `src/__tests__/repo-invariants.test.ts` fails if the client and this list
 * stop agreeing.
 */

export interface GemPack {
  /** Web/Stripe product reference, sent by the client. */
  id: string;
  /** What the buyer is owed. */
  gems: number;
  /** Charged in USD. Prices are stored in USD throughout the app. */
  priceUsd: number;
  /** The matching App Store consumable, for cross-checking the catalogs. */
  storeProductId: string;
  /** Shown on the Stripe checkout page. */
  name: string;
  description: string;
}

export const GEM_PACKS: Record<string, GemPack> = {
  gems_100: {
    id: "gems_100",
    gems: 100,
    priceUsd: 0.99,
    storeProductId: "io.mytrivia.gems.100",
    name: "100 ალმასი - პატარა პაკეტი",
    description: "100 ალმასის შეძენა MyTrivia-ში. გამოიყენეთ სუპერ ძალების გასააქტიურებლად!",
  },
  gems_500: {
    id: "gems_500",
    gems: 500,
    priceUsd: 3.99,
    storeProductId: "io.mytrivia.gems.500",
    name: "500 ალმასი - საშუალო პაკეტი",
    description: "500 ალმასის შეძენა MyTrivia-ში. იდეალური მოთამაშეებისთვის!",
  },
  gems_1500: {
    id: "gems_1500",
    gems: 1500,
    priceUsd: 12.99,
    storeProductId: "io.mytrivia.gems.1500",
    name: "1500 ალმასი - დიდი პაკეტი",
    description: "1500 ალმასის შეძენა MyTrivia-ში.",
  },
  gems_5000: {
    id: "gems_5000",
    gems: 5000,
    priceUsd: 34.99,
    storeProductId: "io.mytrivia.gems.5000",
    name: "5000 ალმასი - მეგა პაკეტი",
    description: "5000 ალმასის შეძენა MyTrivia-ში. საუკეთესო ფასი!",
  },
};

export function lookupGemPack(productId: unknown): GemPack | null {
  if (typeof productId !== "string") return null;
  return GEM_PACKS[productId] ?? null;
}
