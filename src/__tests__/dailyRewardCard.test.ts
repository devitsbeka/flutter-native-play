import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Two things about a stop on the daily-rewards road.
 *
 * A "Claim" you cannot press, over a running countdown. The cause was four
 * date bases where there should have been one — see dailyRewardsWeek.test.ts
 * for that half. This file covers what a stop DRAWS.
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
 *
 * The week was a row of seven cards when this was written and is a road down
 * the screen now, with a medallion for each day instead of a card. None of
 * what is asserted here was about the card: it is about what the gift does,
 * and about a button that must not appear on a day that has not started.
 */
const modal = readFileSync(
  join(process.cwd(), "src/components/home/DailyRewardsModal.tsx"),
  "utf8"
);

describe("what the face of a stop shows", () => {
  it("is always the gift, never the prize", () => {
    // The prize used to replace the gift here while the receipt appeared on
    // the chip below — the answer in two places, and the opened box, which
    // is the thing that says "you opened it", never seen at all.
    const medallion = modal.match(/{\/\* Always the gift[\s\S]*?\n {6}<\/motion\.div>/);
    expect(medallion, "expected the stop's medallion").not.toBeNull();
    expect(modal, "open and closed art, chosen once").toMatch(/const art = isFinal/);
    expect(medallion![0]).toMatch(/src=\{art\}/);
    expect(medallion![0], "the prize belongs on the chip, once").not.toMatch(/RewardPill|awarded\.coins/);
  });

  it("has no leftover prize component", () => {
    // RewardPill existed only for the face of the card. Left behind it would
    // be dead code that still compiles and still looks like the intended
    // design.
    expect(modal).not.toMatch(/function RewardPill/);
  });

  it("keeps the surprise: the road promises no amount before it is opened", () => {
    // The one thing the whole design rests on. claim_daily_reward decides
    // what a day pays — the ladder, the PRO Plus multiplier and the rolled
    // surprise are all its — so a locked stop that named a figure would be
    // this screen guessing at the server's answer in advance.
    const locked = modal.match(/state === "future" \? \([\s\S]*?\n {8}\) :/);
    expect(locked, "expected the locked chip").not.toBeNull();
    expect(locked![0]).toMatch(/dailyRewards\.locked/);
    expect(locked![0]).not.toMatch(/coinIcon|gemIcon|receipt\./);
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

  it("puts that button on the gift itself, and only where there is one", () => {
    // The Claim chip under the medallion was the same instruction written
    // twice — the stop already pulses and the gift already bobs. The whole
    // 80px circle takes the tap now.
    const medallion = modal.match(/{\/\* The tap target IS the gift[\s\S]*?\n {8}\)}/);
    expect(medallion, "expected the tap target on the medallion").not.toBeNull();
    expect(medallion![0]).toMatch(/isClaimable && \(/);
    expect(medallion![0]).toMatch(/aria-label=\{t\("dailyRewards\.claim"\)\}/);

    // And no purple bar left in the slot below it: a claimable stop shows
    // the road under the gift, nothing else.
    expect(modal, "the Claim chip is gone").not.toMatch(/\{phase === "opening" \? "…" : t\("dailyRewards\.claim"\)\}/);
  });
});
