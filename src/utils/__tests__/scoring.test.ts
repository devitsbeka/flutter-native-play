import { describe, it, expect } from "vitest";
import {
  BASE_POINTS,
  FIRST_ANSWER_BONUS,
  QUESTION_TIME_SECONDS,
  TIME_BONUS_MULTIPLIER,
  calculateObserverBonus,
  calculatePoints,
} from "@/utils/scoring";

describe("calculatePoints", () => {
  it("pays nothing for a wrong answer, however fast", () => {
    expect(calculatePoints(false, 15)).toBe(0);
    expect(calculatePoints(false, 0)).toBe(0);
    expect(calculatePoints(false, -3)).toBe(0);
  });

  it("pays base points for a correct answer with no time left", () => {
    expect(calculatePoints(true, 0)).toBe(BASE_POINTS);
  });

  it("pays the maximum for an instant correct answer", () => {
    expect(calculatePoints(true, QUESTION_TIME_SECONDS)).toBe(
      BASE_POINTS + QUESTION_TIME_SECONDS * TIME_BONUS_MULTIPLIER
    );
    expect(calculatePoints(true, QUESTION_TIME_SECONDS)).toBe(250);
  });

  it("scales linearly with whole seconds remaining", () => {
    expect(calculatePoints(true, 5)).toBe(150);
    expect(calculatePoints(true, 10)).toBe(200);
  });

  it("rounds fractional clock values to the second the player saw", () => {
    // The clock ticks in 0.1s steps; paying for the remainder produced
    // totals like 464 that read as random to players.
    expect(calculatePoints(true, 7.4)).toBe(170);
    expect(calculatePoints(true, 7.5)).toBe(180);
    expect(calculatePoints(true, 12.34)).toBe(220);
  });

  it("always returns a clean multiple of ten over the base", () => {
    for (let t = 0; t <= QUESTION_TIME_SECONDS; t += 0.1) {
      expect((calculatePoints(true, t) - BASE_POINTS) % TIME_BONUS_MULTIPLIER).toBe(0);
    }
  });

  it("clamps a clock above the question length — no unbounded payouts", () => {
    expect(calculatePoints(true, 999)).toBe(250);
    expect(calculatePoints(true, Number.MAX_SAFE_INTEGER)).toBe(250);
  });

  it("clamps a negative clock to the base rather than paying negative points", () => {
    expect(calculatePoints(true, -1)).toBe(BASE_POINTS);
    expect(calculatePoints(true, -999)).toBe(BASE_POINTS);
  });

  it("never pays less for a faster answer", () => {
    let previous = -1;
    for (let t = 0; t <= QUESTION_TIME_SECONDS; t += 0.5) {
      const points = calculatePoints(true, t);
      expect(points).toBeGreaterThanOrEqual(previous);
      previous = points;
    }
  });
});

describe("calculateObserverBonus", () => {
  it("pays an observer the same as a correct answer at that speed", () => {
    expect(calculateObserverBonus(10)).toBe(calculatePoints(true, 10));
    expect(calculateObserverBonus(0)).toBe(BASE_POINTS);
    expect(calculateObserverBonus(15)).toBe(250);
  });

  it("stays on the unified scale for out-of-range averages", () => {
    expect(calculateObserverBonus(-5)).toBe(BASE_POINTS);
    expect(calculateObserverBonus(100)).toBe(250);
  });
});

describe("scoring constants", () => {
  it("keeps the first-answer bonus meaningful but under one second of speed", () => {
    // A flat race bonus should not outweigh answering several seconds faster.
    expect(FIRST_ANSWER_BONUS).toBeGreaterThan(0);
    expect(FIRST_ANSWER_BONUS).toBeLessThan(BASE_POINTS);
  });

  it("keeps a perfect answer worth less than three base answers", () => {
    const max = calculatePoints(true, QUESTION_TIME_SECONDS) + FIRST_ANSWER_BONUS;
    expect(max).toBeLessThan(BASE_POINTS * 3);
  });
});
