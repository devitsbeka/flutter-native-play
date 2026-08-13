import { describe, it, expect } from "vitest";
import {
  ALL_SHOP_DEALS,
  DAILY_DEALS,
  HOURLY_DEALS,
  dealSavings,
  type ShopDeal,
} from "@/config/shopDeals";
import { REWARDS } from "@/config/rewardConfig";

// A deal that costs more than its parts, or advertises a discount it does
// not give, is a trust problem the moment a player does the arithmetic.

// Value math from rewardConfig: 1 power ≈ 1 gem, 500 coins = 1 gem,
// VIP day = 30 gems, VIP week = 100 gems. `powers` means N of EACH of 4.
const POWERS_PER_BUNDLE = 4;

const partsValueInGems = (deal: ShopDeal): number => {
  const powersValue = deal.contents.powers * POWERS_PER_BUNDLE;
  const coinsValue = deal.contents.coins / REWARDS.GEM_TO_COINS_RATE;
  const vipValue = deal.contents.vip ? REWARDS.VIP_PRICES[deal.contents.vip] : 0;
  return powersValue + coinsValue + vipValue;
};

describe("shop deals", () => {
  it("ships both rotations with at least one deal each", () => {
    expect(DAILY_DEALS.length).toBeGreaterThan(0);
    expect(HOURLY_DEALS.length).toBeGreaterThan(0);
    expect(ALL_SHOP_DEALS).toHaveLength(DAILY_DEALS.length + HOURLY_DEALS.length);
  });

  it("uses a unique id for every deal", () => {
    const ids = ALL_SHOP_DEALS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefixes every deal id so the bundle grant routes it", () => {
    for (const deal of ALL_SHOP_DEALS) {
      expect(deal.id.startsWith("deal_"), deal.id).toBe(true);
    }
  });

  it("always sells below the full price", () => {
    for (const deal of ALL_SHOP_DEALS) {
      expect(deal.price, deal.id).toBeLessThan(deal.wasPrice);
      expect(deal.price, deal.id).toBeGreaterThan(0);
    }
  });

  it("never charges more than the contents are worth bought separately", () => {
    // The discount has to be real: a "deal" priced above its parts is worse
    // than buying them one by one.
    for (const deal of ALL_SHOP_DEALS) {
      expect(deal.price, `${deal.id} costs more than its parts`).toBeLessThan(
        partsValueInGems(deal)
      );
    }
  });

  it("advertises a wasPrice within a gem or two of the real parts value", () => {
    for (const deal of ALL_SHOP_DEALS) {
      const parts = partsValueInGems(deal);
      expect(
        Math.abs(deal.wasPrice - parts),
        `${deal.id}: wasPrice ${deal.wasPrice} vs parts ${parts}`
      ).toBeLessThanOrEqual(2);
    }
  });

  it("reports a believable saving for every deal", () => {
    for (const deal of ALL_SHOP_DEALS) {
      const savings = dealSavings(deal);
      expect(savings, deal.id).toBeGreaterThanOrEqual(20);
      expect(savings, deal.id).toBeLessThan(100);
    }
  });

  it("computes savings as a whole percentage", () => {
    expect(dealSavings({ ...DAILY_DEALS[0], wasPrice: 100, price: 75 })).toBe(25);
    expect(dealSavings({ ...DAILY_DEALS[0], wasPrice: 40, price: 19 })).toBe(53);
  });

  it("grants something in every deal", () => {
    for (const deal of ALL_SHOP_DEALS) {
      const { powers, coins, vip } = deal.contents;
      expect(powers >= 0 && coins >= 0, deal.id).toBe(true);
      expect(powers > 0 || coins > 0 || !!vip, `${deal.id} grants nothing`).toBe(true);
    }
  });

  it("keeps hourly flash deals cheaper than daily deals", () => {
    const cheapestDaily = Math.min(...DAILY_DEALS.map((d) => d.price));
    const dearestHourly = Math.max(...HOURLY_DEALS.map((d) => d.price));
    expect(dearestHourly).toBeLessThan(cheapestDaily);
  });

  it("shows every hourly deal at some point in a day", () => {
    // The rotation is hour-of-epoch % length, so a day covers the whole set
    // only while there are at most 24 of them. A deal nobody ever sees is
    // just dead config.
    const seen = new Set<string>();
    const startHour = Math.floor(Date.UTC(2026, 7, 13) / 3_600_000);
    for (let h = 0; h < 24; h++) {
      seen.add(HOURLY_DEALS[(startHour + h) % HOURLY_DEALS.length].id);
    }
    expect(seen.size).toBe(HOURLY_DEALS.length);
  });

  it("gives the hourly rotation enough variety to be worth watching", () => {
    // One deal repeating every hour is a static banner with a countdown on
    // it. Several, changing through the day, is the point.
    expect(HOURLY_DEALS.length).toBeGreaterThanOrEqual(4);
    const shapes = new Set(
      HOURLY_DEALS.map((d) => `${d.contents.vip}:${d.contents.powers}:${d.contents.coins}`)
    );
    expect(shapes.size, "two hourly deals grant exactly the same thing").toBe(
      HOURLY_DEALS.length
    );
  });

  it("offers PRO for longer than a day somewhere in the rotation", () => {
    expect(ALL_SHOP_DEALS.some((d) => d.contents.vip === "2days")).toBe(true);
  });

  it("only offers PRO durations the shop can actually activate", () => {
    for (const deal of ALL_SHOP_DEALS) {
      if (!deal.contents.vip) continue;
      expect(Object.keys(REWARDS.VIP_PRICES)).toContain(deal.contents.vip);
    }
  });
});
