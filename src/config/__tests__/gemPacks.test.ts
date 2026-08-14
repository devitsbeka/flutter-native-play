import { describe, it, expect } from "vitest";
import { GEM_PACKS, GEM_PACK_PRODUCTS } from "@/config/gemPacks";

describe("gem packs", () => {
  it("gives every pack a store product id", () => {
    // A pack without one has no native purchase path. The gem shop used to
    // have no native branch at all and sent iOS users to Stripe checkout,
    // which is an App Store guideline 3.1.1 rejection — so a gap here is the
    // start of that same bug.
    for (const pack of GEM_PACKS) {
      expect(pack.productId, `pack ${pack.id}`).toBeTruthy();
    }
  });

  it("keeps product ids under the app's bundle namespace", () => {
    for (const pack of GEM_PACKS) {
      expect(pack.productId, `pack ${pack.id}`).toMatch(/^io\.mytrivia\.gems\./);
    }
  });

  it("does not reuse a product id across packs", () => {
    // Two packs sharing a SKU means the server credits whichever gem count it
    // has on file, not the one the player paid for.
    const ids = GEM_PACKS.map((p) => p.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not reuse a pack id", () => {
    // GEM_PACK_PRODUCTS is keyed by pack id, so duplicates would silently
    // collapse and one pack would buy the other's product.
    const ids = GEM_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(GEM_PACK_PRODUCTS).length).toBe(GEM_PACKS.length);
  });

  it("resolves every pack's id to its own product", () => {
    for (const pack of GEM_PACKS) {
      expect(GEM_PACK_PRODUCTS[pack.id], `pack ${pack.id}`).toBe(pack.productId);
    }
  });

  it("credits the total the card advertises, bonus included", () => {
    // The card reads "700 +200" and the buyer is owed 900. The shop passed the
    // base figure to checkout, so the bonus was advertised on every pack and
    // granted on none — which on the App Store is advertising 900 and
    // delivering 700.
    for (const pack of GEM_PACKS) {
      expect(pack.gems, `pack ${pack.id}`).toBe(pack.baseGems + pack.bonusGems);
      const advertised = pack.bonusGems
        ? `${pack.baseGems} +${pack.bonusGems}`
        : `${pack.baseGems}`;
      expect(pack.name, `pack ${pack.id} label`).toBe(advertised);
    }
  });

  it("gives more gems per dollar as the pack gets bigger", () => {
    // A ladder where a larger pack is worse value is a pricing mistake, and
    // the two ladders this app used to carry disagreed by 4-8x on exactly
    // this ratio.
    const rates = GEM_PACKS.map((p) => p.gems / p.priceUsd);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i], `pack ${GEM_PACKS[i].id} vs ${GEM_PACKS[i - 1].id}`)
        .toBeGreaterThan(rates[i - 1]);
    }
  });

  it("lists packs in ascending size, which the suggestion logic relies on", () => {
    // NotEnoughGemsModal picks the first pack covering the shortfall, so an
    // unsorted list would suggest an unnecessarily large purchase.
    const sizes = GEM_PACKS.map((p) => p.gems);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });

  it("prices every pack above zero", () => {
    for (const pack of GEM_PACKS) {
      expect(pack.priceUsd, `pack ${pack.id}`).toBeGreaterThan(0);
    }
  });
});
