import { describe, it, expect } from "vitest";
import {
  COIN_PACKS,
  COINS_PER_GEM_LIST,
  GEMS_PER_POWER_LIST,
  POWER_BUNDLES,
  POWER_TYPE_COUNT,
  STARTER_BUNDLES,
  cheapestAlternativeGems,
  discountedPrice,
} from "@/config/shopValue";
import { REWARDS } from "@/config/rewardConfig";
import { ALL_SHOP_DEALS } from "@/config/shopDeals";
import { BUNDLE_CONTENTS } from "@/config/bundleContents";

/**
 * The invariant every gem-priced item has to satisfy:
 *
 *   nothing else in this shop assembles the same goods for less.
 *
 * That is what the starter bundles broke. They sold 8 powers + 500 coins for
 * 10 gems while the Mega Powers row sold those powers for 7 and the Coins row
 * sold those coins for 1 — so the "starter deal" cost 25% more than its own
 * parts, and two of the three carried a discount badge. Nothing caught it,
 * because each price had been checked against a 1-gem-per-power list rate that
 * the shop itself undercut.
 */

describe("cheapestAlternativeGems", () => {
  it("never prices an item against itself", () => {
    // Without the exclusion, power_bundle_large defines the only bulk power
    // rate and would be compared against its own price forever — a permanent,
    // meaningless 0%.
    const contents = { powers: 10, coins: 0 };
    const withItself = cheapestAlternativeGems(contents);
    const withoutItself = cheapestAlternativeGems(contents, "power_bundle_large");
    expect(withoutItself).toBeGreaterThan(withItself);
  });

  it("costs a real basket, not a per-unit rate", () => {
    // You cannot buy one power. The single-type packs come in threes and the
    // smallest bundle is two of each, so covering "one of each" costs 7 gems
    // and not the 4 a linear rate would claim.
    expect(cheapestAlternativeGems({ powers: 1, coins: 0 })).toBe(7);
    expect(1 * POWER_TYPE_COUNT * GEMS_PER_POWER_LIST).toBe(4);
  });

  it("prices VIP time at the only price it is sold for", () => {
    const withWeek = cheapestAlternativeGems({ powers: 0, coins: 0, vip: "week" });
    expect(withWeek).toBe(REWARDS.VIP_PRICES.week);
  });
});

describe("discountedPrice", () => {
  it("always lands below the reference, even when rounding would not", () => {
    expect(discountedPrice(10, 25)).toBe(8);
    // A discount too small to survive rounding still has to produce a discount.
    expect(discountedPrice(10, 1)).toBeLessThan(10);
    expect(discountedPrice(2, 0)).toBe(1);
  });

  it("never goes free", () => {
    expect(discountedPrice(1, 90)).toBeGreaterThan(0);
  });
});

describe("every bundle beats assembling it from the shop", () => {
  const bundleIds = Object.keys(BUNDLE_CONTENTS);

  it("covers every bundle id the grant path knows about", () => {
    expect(bundleIds.length).toBeGreaterThan(0);
  });

  it.each(bundleIds)("%s", (id) => {
    const contents = BUNDLE_CONTENTS[id];
    // Bundles that grant raw gems are priced on a different axis; none do
    // today, and shopDeals forbids it deliberately.
    expect(contents.gems ?? 0).toBe(0);

    const alternative = cheapestAlternativeGems(contents, id);
    const priced =
      ALL_SHOP_DEALS.find((d) => d.id === id) ?? STARTER_BUNDLES.find((b) => b.id === id);

    if (priced) {
      expect(priced.price, `${id} costs more than its parts`).toBeLessThan(alternative);
      expect(priced.wasPrice, `${id} advertises a reference it did not compute`).toBe(alternative);
    }
  });

  it("prices every starter pack and every deal, leaving none hand-written", () => {
    const pricedIds = new Set([
      ...ALL_SHOP_DEALS.map((d) => d.id),
      ...STARTER_BUNDLES.map((b) => b.id),
      ...POWER_BUNDLES.map((b) => b.id),
    ]);
    // mega_power_bundle and power_combo_bundle are the home modal's own rows.
    const unpriced = bundleIds.filter((id) => !pricedIds.has(id));
    expect(unpriced.sort()).toEqual(["mega_power_bundle", "power_combo_bundle"]);
  });

  it("gives every starter pack a real discount", () => {
    for (const bundle of STARTER_BUNDLES) {
      expect(bundle.savings, bundle.id).toBeGreaterThan(0);
      expect(bundle.price, bundle.id).toBeLessThan(bundle.wasPrice);
    }
  });
});

describe("the atomic ladders the references are built from", () => {
  it("sells no coin pack for more than smaller packs would cost", () => {
    for (const pack of COIN_PACKS) {
      const alternative = cheapestAlternativeGems({ powers: 0, coins: pack.coins }, pack.id);
      expect(pack.gems, `${pack.id} is dominated`).toBeLessThanOrEqual(alternative);
    }
  });

  it("pays a bonus on the larger coin packs and never a penalty", () => {
    for (const pack of COIN_PACKS) {
      expect(pack.coins / pack.gems, pack.id).toBeGreaterThanOrEqual(COINS_PER_GEM_LIST);
    }
  });

  it("sells no power bundle for more than the single packs would cost", () => {
    for (const bundle of POWER_BUNDLES) {
      const listValue = bundle.powers * POWER_TYPE_COUNT * GEMS_PER_POWER_LIST;
      expect(bundle.gems, `${bundle.id} beats no list price`).toBeLessThan(listValue);
    }
  });

  it("keeps the coin ladder monotonic in coins per gem", () => {
    // A middle rung that pays a worse rate than the one below it is a rung
    // nobody should buy — the same fault gems_1500 had at $12.99.
    const rates = COIN_PACKS.map((p) => p.coins / p.gems);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i], `${COIN_PACKS[i].id} vs ${COIN_PACKS[i - 1].id}`).toBeGreaterThanOrEqual(rates[i - 1]);
    }
  });
});
