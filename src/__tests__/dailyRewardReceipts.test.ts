import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeDailyReceipts, powerUpFromReference } from "@/utils/dailyRewardReceipts";

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

/**
 * The ledger's blind spot, closed.
 *
 * A grant row records coins and gems. Power-ups go straight into
 * user_power_ups as a running total, with no per-day record anywhere — so a
 * day rebuilt from the ledger could show coins and gems but never the
 * power-up, and a week recovered that way looked like coins every day.
 *
 * That is what "we gave the user coins all 3 days, no power-ups at all" was:
 * under the old flat odds a day reads as coins-only 35% of the time when the
 * receipt columns are intact, but 70% when it is rebuilt from the ledger,
 * because a `power` day loses its pill. Three in a row: 4.3% against 34.3%.
 *
 * claim_daily_reward now writes "day 3 power freeze x2" into the grant's
 * reference instead of "day 3 power", which is enough to draw the whole
 * receipt from the ledger alone.
 */
describe("recovering a power-up from the ledger reference", () => {
  it("reads the power-up and its count", () => {
    expect(powerUpFromReference("day 3 power freeze x2")).toEqual({
      powerUp: "freeze",
      powerUpCount: 2,
    });
  });

  it("handles a hyphenated power-up name", () => {
    expect(powerUpFromReference("day 7 power time-drain x3")).toEqual({
      powerUp: "time-drain",
      powerUpCount: 3,
    });
  });

  it("handles the numeric one", () => {
    expect(powerUpFromReference("day 1 power 5050 x1")).toEqual({
      powerUp: "5050",
      powerUpCount: 1,
    });
  });

  it("recovers nothing from the old short form", () => {
    // Rows written before 20260913100000 name the bonus but not the prize.
    // Half-matching those would invent a power-up nobody was given.
    expect(powerUpFromReference("day 3 power")).toBeNull();
  });

  it("recovers nothing from a day that won something else", () => {
    expect(powerUpFromReference("day 3 gems")).toBeNull();
    expect(powerUpFromReference("day 3 double_coins")).toBeNull();
  });

  it("survives a missing reference", () => {
    expect(powerUpFromReference(null)).toBeNull();
    expect(powerUpFromReference(undefined)).toBeNull();
    expect(powerUpFromReference("")).toBeNull();
  });

  it("puts the recovered power-up on the day's receipt", () => {
    const out = mergeDailyReceipts(
      [day("2026-08-25", true, null)],
      [{ coins: 100, gems: 0, created_at: "2026-08-25T09:00:00.000Z", reference: "day 3 power freeze x2" }]
    );
    expect(out["2026-08-25"]).toEqual({
      coins: 100,
      gems: 0,
      powerUp: "freeze",
      powerUpCount: 2,
    });
  });

  it("still lets the receipt columns win where they exist", () => {
    // They are the fuller record; the reference is a reconstruction.
    const out = mergeDailyReceipts(
      [day("2026-08-25", true, 100, { power_up: "replace", power_up_count: 1 })],
      [{ coins: 100, gems: 0, created_at: "2026-08-25T09:00:00.000Z", reference: "day 3 power freeze x2" }]
    );
    expect(out["2026-08-25"].powerUp).toBe("replace");
  });
});

/**
 * The reward ladder itself. The coin base always climbed across the streak;
 * the surprise on top of it did not, so day seven was day one with a bigger
 * number. 20260913100000 makes the surprise climb too.
 */
describe("the reward ladder", () => {
  const ladder = readFileSync(
    join(process.cwd(), "supabase/migrations/20260913100000_daily_reward_ladder.sql"),
    "utf8"
  );

  it("keeps the coin base that already escalated", () => {
    for (const [d, c] of [[1, 50], [2, 75], [3, 100], [4, 125], [5, 150], [6, 200], [7, 300]]) {
      expect(ladder).toMatch(new RegExp(`\\(${d},\\s*${c}\\)`));
    }
  });

  it("makes the power-up more likely as the streak goes on", () => {
    // 20% on day one, 50% on day seven.
    expect(ladder).toMatch(/v_power_pct := 0\.20 \+ 0\.05 \* \(v_day - 1\)/);
  });

  it("holds gems at a flat thirty per cent, so one option stays steady", () => {
    expect(ladder).toMatch(/v_roll < v_power_pct \+ 0\.30/);
  });

  it("grows the size of the prize too, not just its odds", () => {
    expect(ladder).toMatch(/v_gems := \(1 \+ v_day \/ 3\) \+ floor\(random\(\) \* 3\)::integer/);
    expect(ladder).toMatch(/v_power_n := \(1 \+ v_day \/ 5\) \+ floor\(random\(\) \* 2\)::integer/);
  });

  it("still awards exactly one bonus, so the receipt never needs a third pill", () => {
    // `:=` exactly — `:?=` also matched the `IF bonus = 'power'` comparison
    // further down and counted it as a fourth branch.
    const branches = ladder.match(/bonus\s+:=\s+'(power|gems|double_coins)'/g) ?? [];
    expect(branches.map((b) => b.match(/'(\w+)'/)![1]).sort())
      .toEqual(["double_coins", "gems", "power"]);
    expect(ladder).toMatch(/IF v_roll < v_power_pct THEN[\s\S]*?ELSIF[\s\S]*?ELSE[\s\S]*?END IF;/);
  });

  it("records the power-up in the ledger reference", () => {
    expect(ladder).toMatch(/v_reference := v_reference \|\| ' ' \|\| v_power \|\| ' x' \|\| v_power_n::text;/);
  });

  it("keeps the PRO Plus multiplier and the receipt write", () => {
    expect(ladder).toMatch(/v_coins := floor\(v_coins \* 1\.5\)/);
    expect(ladder).toMatch(/coins_awarded = v_coins/);
  });

  it("revokes from PUBLIC before granting, as every definer function must", () => {
    const revokeAt = ladder.indexOf("REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM public;");
    const grantAt = ladder.indexOf("GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;");
    expect(revokeAt).toBeGreaterThan(-1);
    expect(grantAt).toBeGreaterThan(revokeAt);
  });
});
