import { describe, it, expect } from "vitest";
import {
  ALL_POWER_TYPES,
  BUNDLE_CONTENTS,
  bundleValueReceived,
  getBundleContents,
  isBundleId,
} from "@/config/bundleContents";
import { ALL_SHOP_DEALS } from "@/config/shopDeals";

// These tests pin down exactly what a player receives for their gems. A
// change here is a change to real money moving, so it should never pass
// silently — if a number below needs updating, that edit is the review.

describe("bundle contents", () => {
  it("grants the advertised amounts for every fixed bundle", () => {
    expect(BUNDLE_CONTENTS.starter_bundle).toEqual({ powers: 2, coins: 500 });
    expect(BUNDLE_CONTENTS.starter_bundle_medium).toEqual({ powers: 5, coins: 1000 });
    expect(BUNDLE_CONTENTS.starter_bundle_large).toEqual({ powers: 10, coins: 2500 });
    expect(BUNDLE_CONTENTS.power_bundle_small).toEqual({ powers: 2, coins: 0 });
    expect(BUNDLE_CONTENTS.mega_power_bundle).toEqual({ powers: 5, coins: 0 });
    expect(BUNDLE_CONTENTS.power_bundle_large).toEqual({ powers: 10, coins: 0 });
    expect(BUNDLE_CONTENTS.power_combo_bundle).toEqual({ powers: 3, coins: 0 });
  });

  it("exposes every rotating shop deal as a purchasable bundle", () => {
    for (const deal of ALL_SHOP_DEALS) {
      expect(BUNDLE_CONTENTS[deal.id], `deal ${deal.id} is not grantable`).toEqual(deal.contents);
    }
  });

  it("never grants a negative or fractional amount", () => {
    for (const [id, contents] of Object.entries(BUNDLE_CONTENTS)) {
      expect(Number.isInteger(contents.powers), `${id} powers`).toBe(true);
      expect(Number.isInteger(contents.coins), `${id} coins`).toBe(true);
      expect(contents.powers, `${id} powers`).toBeGreaterThanOrEqual(0);
      expect(contents.coins, `${id} coins`).toBeGreaterThanOrEqual(0);
    }
  });

  it("never sells a bundle that grants nothing at all", () => {
    for (const [id, c] of Object.entries(BUNDLE_CONTENTS)) {
      const grantsSomething = c.powers > 0 || c.coins > 0 || (c.gems ?? 0) > 0 || !!c.vip;
      expect(grantsSomething, `${id} grants nothing`).toBe(true);
    }
  });
});

describe("isBundleId", () => {
  it("recognises every id in the contents map", () => {
    for (const id of Object.keys(BUNDLE_CONTENTS)) {
      expect(isBundleId(id), `${id} not routed to the bundle grant`).toBe(true);
    }
  });

  it("does not treat single items as bundles", () => {
    for (const id of ["coins_500", "vip_week", "frame_gold", "single_5050"]) {
      expect(isBundleId(id), `${id} wrongly routed to the bundle grant`).toBe(false);
    }
  });
});

describe("getBundleContents fallback", () => {
  it("guesses a size for unknown ids rather than granting nothing", () => {
    expect(getBundleContents("mystery_small_bundle").powers).toBe(2);
    expect(getBundleContents("mystery_large_bundle").powers).toBe(10);
    expect(getBundleContents("mystery_bundle").powers).toBe(5);
    expect(getBundleContents("mystery_bundle").coins).toBe(0);
  });
});

describe("bundleValueReceived", () => {
  it("logs the same power count for all four power types", () => {
    const receipt = bundleValueReceived("starter_bundle_medium");
    for (const type of ALL_POWER_TYPES) {
      expect(receipt[type]).toBe(5);
    }
  });

  it("matches what the grant step credits, for every bundle", () => {
    for (const id of Object.keys(BUNDLE_CONTENTS)) {
      const contents = getBundleContents(id);
      const receipt = bundleValueReceived(id);

      for (const type of ALL_POWER_TYPES) {
        expect(receipt[type], `${id} ${type}`).toBe(contents.powers);
      }
      expect(receipt.coins ?? 0, `${id} coins`).toBe(contents.coins);
      expect(receipt.gems ?? 0, `${id} gems`).toBe(contents.gems ?? 0);
      expect(receipt.vip_days, `${id} vip`).toBe(contents.vip);
    }
  });

  it("omits zero amounts instead of logging empty lines", () => {
    const receipt = bundleValueReceived("power_bundle_small");
    expect("coins" in receipt).toBe(false);
    expect("gems" in receipt).toBe(false);
    expect("vip_days" in receipt).toBe(false);
  });

  it("records VIP duration for deals that include it", () => {
    const receipt = bundleValueReceived("deal_daily_royal");
    expect(receipt.vip_days).toBe("week");
    expect(receipt.coins).toBe(2500);
  });
});

describe("power type list", () => {
  it("covers exactly the four power-ups a bundle multiplies", () => {
    expect([...ALL_POWER_TYPES].sort()).toEqual(["5050", "freeze", "replace", "time-drain"]);
  });
});
