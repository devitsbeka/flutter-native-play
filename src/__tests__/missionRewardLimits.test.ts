import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { WEEK_BONUS, DAY_BONUS } from "@/hooks/useMissions";

/**
 * Every mission payout has to fit under the database's own ceiling.
 *
 * `credit_gameplay_reward` checks each award against `currency_grant_limits`
 * and raises if it is over. The client cannot see that coming — it sends a
 * number and finds out afterwards — and the week package found out the
 * expensive way: seeded at 1000 coins / 5 gems per call, it was asking for
 * 2000 / 10, so the RPC raised, the error was discarded, and a swept week paid
 * nothing at all.
 *
 * Raising the limit fixed that once. This keeps it fixed: the next reward that
 * grows past the ceiling fails here rather than in a player's hands.
 */

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

/** The 'mission' limits as the last migration to set them leaves them. */
function missionLimitsFromMigrations() {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  let limits: { coinsCall: number; gemsCall: number; coinsDay: number; gemsDay: number } | null = null;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    if (!sql.includes("currency_grant_limits")) continue;

    // Rows look like:  ('mission', 2500, 20, 10000, 80)
    const row = sql.match(
      /\(\s*'mission'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/,
    );
    if (row) {
      limits = {
        coinsCall: Number(row[1]),
        gemsCall: Number(row[2]),
        coinsDay: Number(row[3]),
        gemsDay: Number(row[4]),
      };
    }
  }
  return limits;
}

/** Reward pairs written as `coins: N, gems: M` in a hook's tables. */
function rewardPairs(relPath: string) {
  const src = readFileSync(join(process.cwd(), relPath), "utf8");
  return [...src.matchAll(/coins:\s*(\d+),\s*gems:\s*(\d+)/g)].map((m) => ({
    coins: Number(m[1]),
    gems: Number(m[2]),
  }));
}

describe("mission rewards against the currency ceiling", () => {
  const limits = missionLimitsFromMigrations();

  it("finds the mission limits in the migrations", () => {
    expect(limits).not.toBeNull();
  });

  it("the week package fits in one call", () => {
    expect(WEEK_BONUS.coins).toBeLessThanOrEqual(limits!.coinsCall);
    expect(WEEK_BONUS.gems).toBeLessThanOrEqual(limits!.gemsCall);
  });

  it("the day bonus fits in one call", () => {
    expect(DAY_BONUS.coins).toBeLessThanOrEqual(limits!.coinsCall);
    expect(DAY_BONUS.gems).toBeLessThanOrEqual(limits!.gemsCall);
  });

  it("every daily mission and streak bonus fits in one call", () => {
    const pairs = [
      ...rewardPairs("src/hooks/useMissions.ts"),
      ...rewardPairs("src/hooks/useMissionStreak.ts"),
    ];
    expect(pairs.length).toBeGreaterThan(20);

    const overCoins = pairs.filter((p) => p.coins > limits!.coinsCall);
    const overGems = pairs.filter((p) => p.gems > limits!.gemsCall);
    expect(
      { overCoins, overGems },
      `a mission reward is larger than the per-award limit ` +
        `(${limits!.coinsCall} coins / ${limits!.gemsCall} gems). ` +
        `credit_gameplay_reward raises on it and the player is paid nothing — ` +
        `raise the limit in a migration, or lower the reward.`,
    ).toEqual({ overCoins: [], overGems: [] });
  });

  it("a full day of mission rewards fits under the daily ceiling", () => {
    // The five richest consecutive pool entries a rotation can land on, plus
    // the three bonuses that can be claimed the same day.
    const pool = rewardPairs("src/hooks/useMissions.ts");
    const streak = rewardPairs("src/hooks/useMissionStreak.ts");

    const window = 5;
    let worstCoins = 0;
    let worstGems = 0;
    for (let start = 0; start < pool.length; start++) {
      let c = 0;
      let g = 0;
      for (let k = 0; k < window; k++) {
        const entry = pool[(start + k) % pool.length];
        c += entry.coins;
        g += entry.gems;
      }
      worstCoins = Math.max(worstCoins, c);
      worstGems = Math.max(worstGems, g);
    }

    const bestStreak = streak.reduce(
      (acc, s) => ({ coins: Math.max(acc.coins, s.coins), gems: Math.max(acc.gems, s.gems) }),
      { coins: 0, gems: 0 },
    );

    const dayCoins = worstCoins + DAY_BONUS.coins + WEEK_BONUS.coins + bestStreak.coins;
    const dayGems = worstGems + DAY_BONUS.gems + WEEK_BONUS.gems + bestStreak.gems;

    expect(
      dayCoins,
      `the richest possible day grants ${dayCoins} coins, over the ${limits!.coinsDay} daily limit`,
    ).toBeLessThanOrEqual(limits!.coinsDay);
    expect(
      dayGems,
      `the richest possible day grants ${dayGems} gems, over the ${limits!.gemsDay} daily limit`,
    ).toBeLessThanOrEqual(limits!.gemsDay);
  });
});
