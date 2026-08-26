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

/**
 * The receipt pill's spacing is optical, and the numbers are measured.
 *
 * A uniform `gap-3 px-3` measured DEAD EVEN in the box model and still looked
 * wrong, because a reader sees ink, not boxes, and every glyph here carries a
 * different amount of its own padding: the lucide check sits ~3px inside its
 * 20px, the coin PNG ~4px inside its 18px, the snowflake almost none, and a
 * digit ends flush. Off a 3x screenshot, uniform 12px gave:
 *
 *     left 15.3 | check->coin 17.7 | coin->125 6.0 | 125->power 12.3 | right 13.0
 *
 * — the three that should match spread over 4.7px, and rewards separated by
 * only 2.1x what binds an icon to its own number. After:
 *
 *     left 14.3 | check->coin 13.7 | coin->125 6.0 | 125->power 18.3 | right 14.0
 *
 * — spread 0.7px, separation 3.1x.
 */
describe("the receipt pill's spacing", () => {
  const modal = readFileSync(
    join(process.cwd(), "src/components/home/DailyRewardsModal.tsx"),
    "utf8"
  );
  const pill = modal.match(/<div\s+className="flex h-\[50px\][\s\S]*?\n {10}<\/div>/)?.[0] ?? "";

  it("has a pill to measure", () => {
    expect(pill, "expected the receipt pill").not.toBe("");
  });

  it("no longer spaces everything the same", () => {
    // One gap cannot be right in three places at once when the glyphs on
    // either side of it are differently inset.
    expect(pill).not.toMatch(/\bgap-3\b/);
    expect(pill).not.toMatch(/\bpx-3\b/);
  });

  it("pads the two edges for equal ink, not equal boxes", () => {
    // 11/13 rather than 12/12: the check's ink starts ~1px further in than
    // its box does, and "3x" ends flush.
    expect(pill).toMatch(/pl-\[11px\] pr-\[13px\]/);
  });

  it("holds the check and the first amount at the same distance as the edges", () => {
    expect(pill).toMatch(/<ClaimedAmount icon=\{coinIcon\}[^>]*className="ml-2"/);
  });

  it("separates one reward from the next by clearly more than its own parts", () => {
    // 18px of box against the 2px inside a ClaimedAmount — measured as 18.3
    // of ink against 6.0, a bit over 3x. At 12px it was 2.1x and "125" and
    // the snowflake read as one run.
    expect(pill).toMatch(/<ClaimedAmount icon=\{gemIcon\}[^>]*className="ml-\[18px\]"/);
    expect(pill).toMatch(/<span className="ml-\[18px\] flex shrink-0 items-center gap-0\.5/);
  });

  it("keeps the parts of one reward tight together", () => {
    // The icon and its number are one thing; that is what makes the wider
    // gap between rewards read as a separation at all.
    const amount = modal.match(/function ClaimedAmount[\s\S]*?\n\}/)![0];
    expect(amount).toMatch(/gap-0\.5/);
  });

  it("still fits the widest receipt on one line", () => {
    expect(pill).toMatch(/whitespace-nowrap/);
    expect(pill).toMatch(/min-w-\[144px\] max-w-full/);
  });
});
