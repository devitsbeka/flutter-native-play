import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STARTER_BUNDLES, POWER_BUNDLES, COIN_PACKS } from "@/config/shopValue";
import { ALL_SHOP_DEALS } from "@/config/shopDeals";
import { REWARDS } from "@/config/rewardConfig";
import { AVATAR_FRAMES } from "@/hooks/useAvatarFrames";

/**
 * `shop_catalog` is what the server CHARGES. The TypeScript catalogues are
 * what the app SHOWS. This test is the only thing keeping them the same
 * number.
 *
 * It matters more than the usual mirror-table check, because the failure is
 * silent in the worst direction: a price lowered in the client and not in the
 * migration shows one figure on the card and takes another at the till, and
 * nothing throws. That is the same class of bug as the 2.75x currency
 * converter — display and charge disagreeing — one currency further in.
 */

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

/** The catalogue as the database will hold it, latest write per id wins. */
function catalogFromMigrations(): Map<string, { price: number; coins: number; powers: number; vip: string | null; frame: string | null }> {
  const rows = new Map<string, { price: number; coins: number; powers: number; vip: string | null; frame: string | null }>();

  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const block = sql.match(
      /INSERT INTO public\.shop_catalog[\s\S]*?ON CONFLICT \(id\) DO UPDATE/,
    );
    if (!block) continue;

    for (const m of block[0].matchAll(
      /\('([a-z0-9_]+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(NULL|'[^']*'),\s*(\d+),\s*(NULL|'[^']*'),\s*(NULL|'[^']*')\)/g,
    )) {
      const unquote = (v: string) => (v === "NULL" ? null : v.slice(1, -1));
      rows.set(m[1], {
        price: Number(m[2]),
        coins: Number(m[3]),
        powers: Number(m[4]),
        vip: unquote(m[7]),
        frame: unquote(m[8]),
      });
    }
  }
  return rows;
}

const catalog = catalogFromMigrations();

describe("shop_catalog mirrors the client catalogue", () => {
  it("parsed the migration at all", () => {
    // A regex that quietly matches nothing would make every assertion below
    // vacuous, which is worse than failing.
    expect(catalog.size).toBeGreaterThan(30);
  });

  it.each(COIN_PACKS.map((p) => [p.id, p] as const))("coin pack %s", (id, pack) => {
    const row = catalog.get(id);
    expect(row, `${id} is not in shop_catalog`).toBeDefined();
    expect(row!.price, `${id} price`).toBe(pack.gems);
    expect(row!.coins, `${id} coins`).toBe(pack.coins);
  });

  it.each(POWER_BUNDLES.map((b) => [b.id, b] as const))("power bundle %s", (id, bundle) => {
    const row = catalog.get(id);
    expect(row, `${id} is not in shop_catalog`).toBeDefined();
    expect(row!.price, `${id} price`).toBe(bundle.gems);
    expect(row!.powers, `${id} powers`).toBe(bundle.powers);
  });

  it.each(STARTER_BUNDLES.map((b) => [b.id, b] as const))("starter pack %s", (id, bundle) => {
    const row = catalog.get(id);
    expect(row, `${id} is not in shop_catalog`).toBeDefined();
    // The client price is DERIVED from the contents, so this is the assertion
    // that catches a reference-price change silently repricing the shop.
    expect(row!.price, `${id} price`).toBe(bundle.price);
    expect(row!.coins, `${id} coins`).toBe(bundle.contents.coins);
    expect(row!.powers, `${id} powers`).toBe(bundle.contents.powers);
  });

  it.each(ALL_SHOP_DEALS.map((d) => [d.id, d] as const))("deal %s", (id, deal) => {
    const row = catalog.get(id);
    expect(row, `${id} is not in shop_catalog`).toBeDefined();
    expect(row!.price, `${id} price`).toBe(deal.price);
    expect(row!.coins, `${id} coins`).toBe(deal.contents.coins);
    expect(row!.powers, `${id} powers`).toBe(deal.contents.powers);
    expect(row!.vip, `${id} vip`).toBe(deal.contents.vip ?? null);
  });

  it.each(Object.entries(REWARDS.VIP_PRICES))("VIP %s", (period, gems) => {
    // Both spellings of each row: the shop grid says vip_week_deal, the home
    // modal says vip_week, and they must charge the same.
    const ids = [...catalog.entries()].filter(([, r]) => r.vip === period);
    expect(ids.length, `no shop_catalog row sells ${period}`).toBeGreaterThan(0);
    for (const [id, row] of ids) {
      // Deals bundle VIP with other things and are priced as a discount.
      if (id.startsWith("deal_")) continue;
      expect(row.price, `${id} price`).toBe(gems);
    }
  });

  it.each(AVATAR_FRAMES.filter((f) => f.price > 0).map((f) => [f.id, f.price] as const))(
    "frame %s",
    (frameId, price) => {
      const row = catalog.get(`frame_${frameId}`);
      expect(row, `frame_${frameId} is not in shop_catalog`).toBeDefined();
      expect(row!.price, `frame_${frameId} price`).toBe(price);
      expect(row!.frame).toBe(frameId);
    },
  );

  it("sells no frame that is meant to be earned", () => {
    // The three vip-* frames are subscriber rewards, claimed through
    // claim_vip_frame after a server-side subscription check. A priced row for
    // one would make it buyable outright.
    for (const frame of AVATAR_FRAMES.filter((f) => f.vipOnly)) {
      expect(catalog.has(`frame_${frame.id}`), `${frame.id} is on sale`).toBe(false);
    }
  });

  it("never lists an item that grants more gems than it costs", () => {
    for (const [id, row] of catalog) {
      expect(row.price, `${id} is free`).toBeGreaterThan(0);
    }
  });
});
