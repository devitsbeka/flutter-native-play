import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Two things about the daily-rewards card.
 *
 * A "Claim" you cannot press, over a running countdown. The cause was four
 * date bases where there should have been one — see dailyRewardsWeek.test.ts
 * for that half. This file covers what the card DRAWS.
 *
 * Reproduced and fixed in a browser with the timezone emulated to UTC+4 and
 * the clock inside the window where the two calendars disagree — the same
 * hour as the report:
 *
 *   old   Mon Missed | Tue OPEN+receipt | Wed CLOSED + "Claim" (disabled)
 *   new   Mon Missed | Tue OPEN+receipt | Wed CLOSED, locked, no button
 *
 * Wednesday was the DEVICE's today; Tuesday was the day the reward actually
 * belonged to. The old card offered a button on a day that had not started.
 */
const modal = readFileSync(
  join(process.cwd(), "src/components/home/DailyRewardsModal.tsx"),
  "utf8"
);

describe("what the middle of the card shows", () => {
  it("is always the gift, never the prize", () => {
    // The prize used to replace the gift here while the receipt appeared on
    // the button below — the answer in two places, and the opened box, which
    // is the thing that says "you opened it", never seen at all.
    const middle = modal.match(
      /<div className="relative flex h-\[96px\][\s\S]*?\n {6}<\/div>/
    );
    expect(middle, "expected the card's middle").not.toBeNull();
    expect(middle![0]).toMatch(/src=\{showOpenGift \? giftOpenIcon : giftClosedIcon\}/);
    expect(middle![0], "the prize belongs on the button, once").not.toMatch(/RewardPill|awarded\.coins/);
  });

  it("has no leftover prize component", () => {
    // RewardPill existed only for the middle. Left behind it would be dead
    // code that still compiles and still looks like the intended design.
    expect(modal).not.toMatch(/function RewardPill/);
  });

  it("opens, then settles", () => {
    // Still bobbing after it has been opened reads as still waiting to be.
    expect(modal).toMatch(/phase === "revealed"[\s\S]{0,200}?scale: \[1\.2, 0\.95, 1\]/);
  });

  it("still itemises the claim on the button", () => {
    // The receipt is the one place the amounts appear now, so it has to stay.
    // It reads `receipt` — the day's own claim, whichever source supplied it
    // — rather than only the refetched row; see dailyRewardReceipts.test.ts.
    expect(modal).toMatch(/<ClaimedAmount icon=\{coinIcon\} value=\{String\(receipt\.coins\)\}/);
  });
});

describe("today, but not yet", () => {
  it("says the wait rather than offering a dead button", () => {
    // Measured: with the timer knowing the day is spent and the week's claims
    // not yet loaded, the card now reads 00:00:48 where it used to read
    // "Claim" and refuse the press.
    expect(modal).toMatch(/!canClaim && phase === "idle" \? \(/);
    expect(modal).toMatch(/\{timeLeft\}<\/span>/);
  });

  it("is given the same countdown the modal shows underneath", () => {
    // Two clocks would be worse than one dead button.
    expect(modal).toMatch(/timeLeft=\{dailyTimeLeft\}/);
  });

  it("keeps the real button for a day that can be claimed", () => {
    expect(modal).toMatch(/onClick=\{canClaim && phase === "idle" \? onClaim : undefined\}/);
  });
});
