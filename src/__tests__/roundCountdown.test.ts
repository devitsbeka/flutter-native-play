import { describe, it, expect } from "vitest";
import { countdownNumberAt, msUntilNextTick, COUNTDOWN_MS } from "@/utils/roundCountdown";

/**
 * Everyone counts to the same clock.
 *
 * The count is read from the room's start time, not run locally, so a player
 * who was browsing elsewhere when the host pressed start joins it in
 * progress. Counting locally from mount would hand that player a fresh "3"
 * and put them a second behind the question.
 */
const START = "2026-08-23T12:00:00.000Z";
const at = (ms: number) => Date.parse(START) + ms;

describe("the number on screen", () => {
  it("opens on 3", () => {
    expect(countdownNumberAt(START, at(0))).toBe(3);
    expect(countdownNumberAt(START, at(999))).toBe(3);
  });

  it("counts down a second at a time", () => {
    expect(countdownNumberAt(START, at(1000))).toBe(2);
    expect(countdownNumberAt(START, at(1999))).toBe(2);
    expect(countdownNumberAt(START, at(2000))).toBe(1);
    expect(countdownNumberAt(START, at(2999))).toBe(1);
  });

  it("is over when the count is spent", () => {
    expect(countdownNumberAt(START, at(COUNTDOWN_MS))).toBeNull();
    expect(countdownNumberAt(START, at(9999))).toBeNull();
  });

  // The reason the whole thing reads a timestamp.
  it("shows a late arrival where the count actually is", () => {
    // Host started 1.2s ago; this player has just been pulled in from Discover.
    expect(countdownNumberAt(START, at(1200))).toBe(2);
  });

  it("never holds back someone who arrives after it ended", () => {
    // Four seconds late: straight into the question, no count at all.
    expect(countdownNumberAt(START, at(4000))).toBeNull();
  });

  it("shows nothing when the room recorded no start", () => {
    // An unknown start must not gate a question that is already running.
    expect(countdownNumberAt(null, at(0))).toBeNull();
    expect(countdownNumberAt(undefined, at(0))).toBeNull();
    expect(countdownNumberAt("not a date", at(0))).toBeNull();
  });

  it("survives a device clock that is behind the server", () => {
    // Would otherwise compute 4, 5, 6... and render a number nobody expects.
    expect(countdownNumberAt(START, at(-2500))).toBe(3);
  });
});

describe("scheduling the next repaint", () => {
  it("waits for the next whole second", () => {
    expect(msUntilNextTick(START, at(0))).toBe(1000);
    expect(msUntilNextTick(START, at(250))).toBe(750);
    expect(msUntilNextTick(START, at(1750))).toBe(250);
  });

  it("stops scheduling once the count is over", () => {
    expect(msUntilNextTick(START, at(COUNTDOWN_MS))).toBeNull();
    expect(msUntilNextTick(null, at(0))).toBeNull();
  });
});
