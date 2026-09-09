import { describe, it, expect } from "vitest";
import {
  ALL_SHOP_DEALS,
  DAILY_DEALS,
  HOURLY_DEALS,
  dealSavings,
  type ShopDeal,
} from "@/config/shopDeals";
import { REWARDS } from "@/config/rewardConfig";
import { readFileSync } from "node:fs";
import { cheapestAlternativeGems } from "@/config/shopValue";

// A deal that costs more than its parts, or advertises a discount it does
// not give, is a trust problem the moment a player does the arithmetic.

// The LIST value: what the contents cost at the shop's per-unit rates, with no
// bulk pack applied. Powers really are sold at a gem each (three of one type
// for three gems) and coins at 500 to the gem, so this is a purchasable
// number — but it is not the CHEAPEST route, and a deal that quoted it was
// advertising a couple of points more discount than it gave. `wasPrice` is
// computed by shopValue.ts from the cheapest route instead, and the assertion
// below is that it never exceeds this.
const POWERS_PER_BUNDLE = 4;

const listValueInGems = (deal: ShopDeal): number => {
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
        listValueInGems(deal)
      );
    }
  });

  it("advertises a reference price somebody could actually have paid", () => {
    // `wasPrice` is the cheapest basket of OTHER shop items that delivers at
    // least these contents — not a per-unit valuation. The difference is the
    // whole point, and it runs in both directions:
    //
    //   deal_daily_champion  list 280, real 267 — a bulk power bundle beats
    //                        the list rate, so quoting 280 overstated the
    //                        discount by a couple of points.
    //   deal_hourly_duo      list 130, real 133 — powers are sold in threes
    //                        and pairs, so "one of each" cannot be bought for
    //                        the four gems a per-unit rate implies. The
    //                        cheapest real purchase is seven.
    //
    // Only the computed figure is a price. The list value is a valuation, and
    // a valuation on a discount badge is the reference-price claim guideline
    // 2.3.1 calls out.
    for (const deal of ALL_SHOP_DEALS) {
      expect(deal.wasPrice, deal.id).toBe(cheapestAlternativeGems(deal.contents, deal.id));
      expect(listValueInGems(deal), `${deal.id} is nowhere near its list value`)
        .toBeGreaterThan(deal.wasPrice * 0.8);
    }
  });

  it("computes both prices rather than carrying hand-written ones", () => {
    // The bug: VIP gem prices moved 2.28x and every hand-written deal price
    // would have gone on selling a 230-gem week of PRO for 69 gems.
    const source = readFileSync("src/config/shopDeals.ts", "utf8");
    expect(source).not.toMatch(/^\s*wasPrice:\s*\d+/m);
    expect(source).not.toMatch(/^\s*price:\s*\d+/m);
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
    // The two rotations are meant to differ in size: an hourly deal is an
    // impulse, a daily one is a commitment. This is the assertion that caught
    // the VIP reprice — once two days of PRO cost 125 gems rather than 55, the
    // two-day deal was the dearest thing in the cheap rotation while the
    // one-day deal sat in the expensive one. They swapped rotations; neither
    // offer changed.
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
