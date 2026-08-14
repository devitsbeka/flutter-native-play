/**
 * What another game costs once the free five are gone.
 *
 * These numbers are the UI's copy of a price list that lives in the database
 * — buy_extra_plays() charges from its own table and ignores anything the
 * client says about money. They are here so a button can say "500" without a
 * round trip, and the test beside this file reads the migration to make sure
 * the two never drift.
 */

export type ExtraPlaySource = "coins" | "gems" | "ad";

export interface ExtraPlayPack {
  /** Games handed over. Also the pack's id in every call and label. */
  games: number;
  coins: number;
  gems: number;
  /**
   * Whether a rewarded ad buys this pack. One ad is worth one game, so only
   * the small one — an ad that paid for three would make gems the worse deal.
   */
  ad: boolean;
}

export const EXTRA_PLAY_PACKS: readonly ExtraPlayPack[] = [
  { games: 1, coins: 500, gems: 1, ad: true },
  { games: 3, coins: 1500, gems: 3, ad: false },
] as const;

/** The price of a pack in one currency, or null when it is not sold that way. */
export function extraPlayPrice(pack: ExtraPlayPack, source: ExtraPlaySource): number | null {
  if (source === "coins") return pack.coins;
  if (source === "gems") return pack.gems;
  return pack.ad ? 0 : null;
}

/** Whether the player's balance covers a pack bought this way. */
export function canAffordExtraPlays(
  pack: ExtraPlayPack,
  source: ExtraPlaySource,
  balances: { coins: number; gems: number },
): boolean {
  if (source === "ad") return pack.ad;
  const price = extraPlayPrice(pack, source);
  if (price === null) return false;
  return (source === "coins" ? balances.coins : balances.gems) >= price;
}
