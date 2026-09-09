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
    const medallion = modal.match(/<motion\.div[\s\S]*?<\/motion\.div>/);
    expect(medallion, "expected the stop's medallion").not.toBeNull();
    expect(modal, "open and closed art, chosen once").toMatch(/const art = isFinal/);
    expect(medallion![0]).toMatch(/src=\{art\}/);
    expect(medallion![0], "the prize belongs in the caption, once").not.toMatch(/RewardPill|awarded\.coins/);
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
    // A locked stop is a lock on a white face and a greyed weekday under it —
    // no figure, and no word either. What a day pays is decided by
    // claim_daily_reward when it is opened, so a number here would be this
    // screen guessing at the server's answer in advance.
    const locked = modal.match(/\{state === "future" \? \([\s\S]*?\n {8}\) : \(/);
    expect(locked, "expected the locked face").not.toBeNull();
    expect(locked![0]).toMatch(/<Lock className/);
    expect(locked![0]).not.toMatch(/coinIcon|gemIcon|receipt\./);
    // The state still reaches a screen reader, which a lock glyph alone does not.
    expect(modal).toMatch(/dailyRewards\.locked/);
    expect(modal).toMatch(/aria-label=\{`\$\{weekday\} — \$\{spokenState\}`\}/);
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
    expect(modal).toMatch(/!canClaim && phase === "idle" && isToday \? \(/);
    expect(modal).toMatch(/\{timeLeft\}\s*\n\s*<\/div>/);
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

/**
 * The road has to look like the rest of this app, and that is not a matter of
 * taste that can be left to whoever edits it next.
 *
 * It has been wrong twice. First a green meadow with cartoon toadstools on a
 * white sheet — an illustration of a different product. Then the same meadow
 * repainted in the app's seven brand gradients, with a bar under every stop
 * in that day's gradient and the takings written across it in white: correct
 * palette, and worse, because seven colour families and fourteen saturated
 * objects on a phone screen is a coupon app, and every number on it had to
 * fight its own background to be read.
 *
 * The rule now is one saturated object on the screen — today — and everything
 * else white, the sheet's lavender, or dark ink. These assertions are that
 * rule. What a plant is shaped like is free; how loud it is, is not.
 */
describe("the road keeps to one colour", () => {
  const canvas = readFileSync(
    join(process.cwd(), "src/components/home/RewardRoadCanvas.tsx"),
    "utf8"
  );

  it("floats on the lavender the other modals are built on", () => {
    expect(modal).toMatch(/linear-gradient\(180deg, #FDFAFF 0%, #F4EEFB 100%\)/);
    // The white sheet, gone: it read as a different app between two modals
    // that share a background.
    expect(modal).not.toMatch(/rounded-\[28px\] bg-white/);
    // And the ground under the road is the same family, not a green field.
    expect(canvas).toMatch(/id="road-ground"[\s\S]{0,200}?stopColor="#FDFAFF"/);
  });

  it("saturates exactly one thing: today", () => {
    // The seven-gradient rainbow, gone with the bars it painted.
    expect(modal).not.toMatch(/DAY_GRADIENTS/);
    expect(modal).toMatch(/const TODAY_FACE = "linear-gradient\(180deg, #9B6BF3 0%, #7126D5 100%\)"/);
    // Every other face is white or the sheet's own tint.
    expect(modal).toMatch(/const CLAIMED_FACE = "#FFFFFF"/);
    expect(modal).toMatch(/const face = isToday \? TODAY_FACE/);
  });

  it("stands the one interactive stop on the app's hard edge, and nothing else", () => {
    // The idiom is for things you press. Seven medallions and seven bars all
    // standing on their own coloured edge is not an idiom, it is a texture.
    expect(modal).toMatch(/0 5px 0 \$\{TODAY_EDGE\}/);
    const edges = modal.match(/0 \d+px 0 \$\{[A-Z_]+\}/g) ?? [];
    expect(edges.length, "one hard coloured edge on the map").toBe(1);
  });

  it("draws its white chips the way every other chip in the app is drawn", () => {
    expect(modal).toMatch(/border: `1\.5px solid \$\{RING\}`/);
    expect(modal).toMatch(/boxShadow: "0 2px 0 #EDE6F7"/);
  });

  it("plants nothing louder than a watermark", () => {
    // Three tints of the sheet's own lavender and white. A literal fill
    // outside that set is how this scene got its sage greens, and then its
    // amber sparkles.
    const fills = [...canvas.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());
    expect(fills.filter((f) => f !== "#FFFFFF"), "literal fills in the planting").toEqual([]);
    expect(canvas).not.toMatch(/linearGradient id="g-/);
    // And nothing glitters beside a road whose point is the one stop on it.
    expect(canvas).not.toMatch(/sparkle|crystal|butterfly|cloud/);
  });

  it("keeps the streak the quietest thing on the sheet", () => {
    // Three pastel pills, then a full-width green gradient bar borrowed from
    // the missions sheet — which is a fine component there and was the
    // loudest object here, on a screen whose whole point had become restraint.
    expect(modal).not.toMatch(/linear-gradient\(90deg, #2DD4A0/);
    expect(modal).toMatch(/style=\{CHIP_SURFACE\}/);
    expect(modal).toMatch(/t\("missions\.streak"\)/);

    // And only one clock in the modal: the one under today's stop, where the
    // gift you cannot open yet is.
    expect(modal.match(/timeLeft=\{dailyTimeLeft\}/g)?.length, "one countdown").toBe(1);
    expect(modal).not.toMatch(/linear-gradient\(135deg, #FEF3C7/);
  });
});
