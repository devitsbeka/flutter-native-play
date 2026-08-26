import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeDailyReceipts } from "@/utils/dailyRewardReceipts";

/**
 * Every claimed day says what it paid.
 *
 * The report: one day of the week showed "✓ 🪙 100" and the others showed a
 * bare tick, with nothing on screen to explain the difference. It was not a
 * rendering bug. The card reads `user_daily_rewards.coins_awarded`, and those
 * columns arrived in a later migration than the feature — so every day
 * claimed before it ran has them NULL and there was nothing to print.
 *
 * `currency_grants` is the way out, and it is not a reconstruction: the same
 * claim_daily_reward call that fills the receipt columns also writes a ledger
 * row through apply_currency_grant carrying the coins and gems it paid.
 */
const day = (d: string, claimed: boolean, coins?: number | null, extra: Record<string, unknown> = {}) => ({
  reward_date: d,
  daily_claimed: claimed,
  coins_awarded: coins === undefined ? null : coins,
  ...extra,
});

describe("assembling a week of receipts", () => {
  it("uses the receipt columns when they are filled in", () => {
    const out = mergeDailyReceipts([
      day("2026-08-24", true, 100, { gems_awarded: 5, power_up: "freeze", power_up_count: 2 }),
    ]);
    expect(out["2026-08-24"]).toEqual({ coins: 100, gems: 5, powerUp: "freeze", powerUpCount: 2 });
  });

  it("falls back to the ledger for a day claimed before those columns existed", () => {
    // This is the day that used to show a bare tick.
    const out = mergeDailyReceipts(
      [day("2026-08-25", true, null)],
      [{ coins: 75, gems: 0, created_at: "2026-08-25T09:14:00.000Z" }]
    );
    expect(out["2026-08-25"]).toEqual({ coins: 75, gems: 0, powerUp: null, powerUpCount: 0 });
  });

  it("gives the whole week a receipt where the two sources between them can", () => {
    const out = mergeDailyReceipts(
      [
        day("2026-08-24", true, 100),
        day("2026-08-25", true, null),
        day("2026-08-26", true, null),
      ],
      [
        { coins: 50, gems: 1, created_at: "2026-08-25T22:00:00.000Z" },
        { coins: 60, gems: 0, created_at: "2026-08-26T06:30:00.000Z" },
      ]
    );
    expect(Object.keys(out).sort()).toEqual(["2026-08-24", "2026-08-25", "2026-08-26"]);
    expect(out["2026-08-24"].coins).toBe(100);
    expect(out["2026-08-25"].coins).toBe(50);
    expect(out["2026-08-26"].coins).toBe(60);
  });

  it("never lets the thinner record overwrite the fuller one", () => {
    // A grant row has no power-up — nothing records one per day. If the
    // ledger were applied last, a day would lose its power-up to a poorer
    // record of the very same claim.
    const out = mergeDailyReceipts(
      [day("2026-08-24", true, 100, { gems_awarded: 5, power_up: "5050", power_up_count: 3 })],
      [{ coins: 100, gems: 5, created_at: "2026-08-24T10:00:00.000Z" }]
    );
    expect(out["2026-08-24"].powerUp).toBe("5050");
    expect(out["2026-08-24"].powerUpCount).toBe(3);
  });

  it("does not paint an unclaimed day from a stray grant", () => {
    // A daily_reward grant with no claimed row means something is out of
    // step. Drawing a claimed card off the back of it would hide that.
    const out = mergeDailyReceipts(
      [day("2026-08-24", false, null)],
      [{ coins: 100, gems: 0, created_at: "2026-08-24T10:00:00.000Z" }]
    );
    expect(out["2026-08-24"]).toBeUndefined();
  });

  it("ignores days that were never claimed", () => {
    const out = mergeDailyReceipts([day("2026-08-24", false, 100), day("2026-08-25", null as unknown as boolean, 50)]);
    expect(Object.keys(out)).toEqual([]);
  });

  it("keys a grant on its UTC day, the calendar reward_date uses", () => {
    // 22:00 UTC is already the next local day east of UTC. Keying on the
    // device's calendar would file this claim under the 26th and leave the
    // 25th — the day the database recorded — with a bare tick.
    const out = mergeDailyReceipts(
      [day("2026-08-25", true, null)],
      [{ coins: 40, gems: 0, created_at: "2026-08-25T22:30:00.000Z" }]
    );
    expect(out["2026-08-25"]?.coins).toBe(40);
    expect(out["2026-08-26"]).toBeUndefined();
  });

  it("treats a zero-coin grant as a real receipt, not a missing one", () => {
    const out = mergeDailyReceipts(
      [day("2026-08-25", true, null)],
      [{ coins: 0, gems: 3, created_at: "2026-08-25T08:00:00.000Z" }]
    );
    expect(out["2026-08-25"]).toEqual({ coins: 0, gems: 3, powerUp: null, powerUpCount: 0 });
  });

  it("leaves a day with no record anywhere alone", () => {
    // The honest floor. Inventing a plausible figure would be the screen
    // lying about the player's own ledger.
    const out = mergeDailyReceipts([day("2026-08-24", true, null)], []);
    expect(out["2026-08-24"]).toBeUndefined();
  });

  it("survives a ledger query that failed", () => {
    expect(() => mergeDailyReceipts([day("2026-08-24", true, 10)])).not.toThrow();
  });
});

describe("what the card does with it", () => {
  const modal = readFileSync(
    join(process.cwd(), "src/components/home/DailyRewardsModal.tsx"),
    "utf8"
  );

  it("reads the reveal's own receipt, not only the refetched one", () => {
    // `awarded` was passed to the card and never read: the reveal worked
    // only because handleClaim also wrote into claimedRewards, and any day
    // the tables had nothing for fell straight through to a bare tick.
    expect(modal).toMatch(/const receipt = awarded \?\? claimedReward;/);
    expect(modal).toMatch(/<ClaimedAmount icon=\{coinIcon\} value=\{String\(receipt\.coins\)\}/);
  });

  it("still shows the opened gift for a claimed day", () => {
    expect(modal).toMatch(/const showOpenGift = state === "claimed" \|\| phase === "revealed";/);
    expect(modal).toMatch(/src=\{showOpenGift \? giftOpenIcon : giftClosedIcon\}/);
  });

  it("asks the ledger for the week as well as the rewards table", () => {
    expect(modal).toMatch(/\.from\("currency_grants"\)/);
    expect(modal).toMatch(/\.eq\("kind", "daily_reward"\)/);
    expect(modal).toMatch(/mergeDailyReceipts\(rows,/);
  });

  it("bounds the ledger query to this week, upper bound exclusive", () => {
    // lte on a timestamp would take only the instant Sunday began.
    expect(modal).toMatch(/\.gte\("created_at", `\$\{weekStart\}T00:00:00\.000Z`\)/);
    expect(modal).toMatch(/\.lt\("created_at", `\$\{rewardISO\(dayAfterWeek\)\}T00:00:00\.000Z`\)/);
  });

  it("has no inline copy of the merge left behind", () => {
    // Two copies of "which source wins" is how they drift apart.
    expect(modal).not.toMatch(/claimed before receipts existed/);
  });
});
