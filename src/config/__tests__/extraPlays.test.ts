import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EXTRA_PLAY_PACKS,
  canAffordExtraPlays,
  extraPlayPrice,
  type ExtraPlayPack,
} from "@/config/extraPlays";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260813220000_buy_extra_plays.sql",
);

const packOf = (games: number): ExtraPlayPack => {
  const pack = EXTRA_PLAY_PACKS.find((p) => p.games === games);
  if (!pack) throw new Error(`no pack of ${games}`);
  return pack;
};

describe("extra play packs", () => {
  it("charges what the database charges", () => {
    // The button says 500 and the server takes whatever buy_extra_plays() has
    // written down. If someone retunes one of them alone, the player is shown
    // a price that is not the price — so the SQL is read here rather than
    // trusted. The branches parsed are the pack arms of that function:
    //
    //   IF p_games = 1 THEN v_coin_price := 500; v_gem_price := 1;
    const sql = readFileSync(MIGRATION, "utf8");
    for (const pack of EXTRA_PLAY_PACKS) {
      const arm = new RegExp(
        `p_games = ${pack.games} THEN\\s+v_coin_price := (\\d+);\\s+v_gem_price := (\\d+);`,
      );
      const match = sql.match(arm);
      expect(match, `no SQL arm for a pack of ${pack.games}`).toBeTruthy();
      expect(Number(match![1]), `coin price for ${pack.games}`).toBe(pack.coins);
      expect(Number(match![2]), `gem price for ${pack.games}`).toBe(pack.gems);
    }
  });

  it("sells every pack the database knows about, and no others", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const inSql = [...sql.matchAll(/p_games = (\d+) THEN/g)].map((m) => Number(m[1]));
    expect(inSql.sort()).toEqual(EXTRA_PLAY_PACKS.map((p) => p.games).sort());
  });

  it("only lets an ad buy the single game", () => {
    // The server refuses `ad` for anything but one game, so a pack offering
    // an ad button the server will not honour is a dead button.
    expect(packOf(1).ad).toBe(true);
    expect(packOf(3).ad).toBe(false);
    expect(extraPlayPrice(packOf(3), "ad")).toBeNull();
  });

  it("keeps the bigger pack from being the worse deal", () => {
    // Three games have to cost at most three times one, in both currencies,
    // or nobody should ever buy the pack.
    const one = packOf(1);
    const three = packOf(3);
    expect(three.coins).toBeLessThanOrEqual(one.coins * 3);
    expect(three.gems).toBeLessThanOrEqual(one.gems * 3);
  });

  it("reads a balance the same way the server does", () => {
    const one = packOf(1);
    expect(canAffordExtraPlays(one, "coins", { coins: 500, gems: 0 })).toBe(true);
    expect(canAffordExtraPlays(one, "coins", { coins: 499, gems: 99 })).toBe(false);
    expect(canAffordExtraPlays(one, "gems", { coins: 0, gems: 1 })).toBe(true);
    expect(canAffordExtraPlays(one, "gems", { coins: 9999, gems: 0 })).toBe(false);
    // An ad costs nothing, so an empty balance still buys the small pack —
    // and never the big one.
    expect(canAffordExtraPlays(one, "ad", { coins: 0, gems: 0 })).toBe(true);
    expect(canAffordExtraPlays(packOf(3), "ad", { coins: 0, gems: 0 })).toBe(false);
  });
});
