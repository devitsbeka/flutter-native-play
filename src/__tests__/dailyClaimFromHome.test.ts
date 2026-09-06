import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The gift tab on the home screen claims where it is tapped.
 *
 * It used to open the rewards sheet, which is a carousel of the week with a
 * claim button inside it — so a tab already labelled "claim" asked for the
 * same yes twice, for a reward nobody would decline. The tap claims now, and
 * the celebration comes to the tab.
 *
 * The sheet is not gone: with nothing to claim the same tap opens it, which
 * is where the week and the streak are read.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const index = read("src/pages/Index.tsx");
const hook = read("src/hooks/useQuickDailyClaim.ts");

describe("tapping the gift", () => {
  it("claims instead of opening the sheet", () => {
    expect(index).toMatch(/onGiftClick=\{handleGiftClick\}/);
    // The old wiring, gone: the tab opened the sheet whatever its state.
    expect(index).not.toMatch(/onGiftClick=\{\(\) => setIsDailyRewardsOpen\(true\)\}/);
  });

  it("opens the sheet only when there is nothing to claim", () => {
    const handler = /const handleGiftClick = useCallback\(\(\) => \{([\s\S]*?)\}, \[/.exec(index)?.[1] ?? "";
    expect(handler, "handleGiftClick").not.toBe("");
    expect(handler).toMatch(/if \(canClaimDaily\)/);
    expect(handler).toMatch(/claimDailyNow\(\)/);
    expect(handler).toMatch(/setIsDailyRewardsOpen\(true\)/);
    // The claim comes first: the sheet is the fallback, not the destination.
    expect(handler.indexOf("claimDailyNow")).toBeLessThan(handler.indexOf("setIsDailyRewardsOpen"));
  });
});

describe("the quick claim", () => {
  it("goes through the same server call the sheet uses", () => {
    // Never a client-side credit: claim_daily_reward decides the payout
    // (CLAUDE.md rule 3).
    expect(hook).toMatch(/useDailyRewardsClaim/);
    expect(hook).toMatch(/claimDailyReward\(\)/);
    expect(hook).not.toMatch(/update_user_currency|addCoins|from\("profiles"\)/);
  });

  it("refuses a second tap while one is in flight", () => {
    expect(hook).toMatch(/if \(!user \|\| !canClaimDaily \|\| claiming\) return false;/);
  });

  it("celebrates where the player tapped, and says what was awarded", () => {
    expect(hook).toMatch(/vibrate\(/);
    expect(hook).toMatch(/playSound\("reward"\)/);
    expect(hook).toMatch(/confetti\(/);
    // The receipt names the server's figures, not a local guess.
    expect(hook).toMatch(/claim\.coins/);
    expect(hook).toMatch(/claim\.gems/);
    expect(hook).toMatch(/claim\.powerUpCount/);
  });

  it("refreshes the balances and the tab's own countdown", () => {
    expect(hook).toMatch(/fetchProfile\(user\.id\)/);
    expect(hook).toMatch(/refreshTimers\(\)/);
  });
});
