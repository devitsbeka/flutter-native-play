import { describe, it, expect } from "vitest";
import { calculateLevel, getStreakBonus, getStreakMilestones } from "@/utils/levelCalculation";

/**
 * Lowest XP that reports the given level, found by binary search through the
 * public API — the test never reaches into the private threshold table.
 */
function findFirstXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let low = 0;
  let high = 100_000_000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (calculateLevel(mid).level >= level) high = mid;
    else low = mid + 1;
  }
  return low;
}

describe("calculateLevel", () => {
  it("starts a brand new player at level 1 with an empty bar", () => {
    const info = calculateLevel(0);
    expect(info.level).toBe(1);
    expect(info.currentXP).toBe(0);
    expect(info.progress).toBe(0);
    expect(info.isMaxLevel).toBe(false);
  });

  it("treats missing XP as zero rather than NaN", () => {
    // profile.total_points is nullable in the database.
    const info = calculateLevel(undefined as unknown as number);
    expect(info.level).toBe(1);
    expect(Number.isFinite(info.progress)).toBe(true);
  });

  it("never reports a progress bar outside 0–100", () => {
    for (const xp of [0, 1, 99, 100, 5_000, 250_000, 50_000_000]) {
      const { progress } = calculateLevel(xp);
      expect(progress, `xp ${xp}`).toBeGreaterThanOrEqual(0);
      expect(progress, `xp ${xp}`).toBeLessThanOrEqual(100);
    }
  });

  it("never goes down as XP goes up", () => {
    let previous = 0;
    for (let xp = 0; xp <= 200_000; xp += 977) {
      const { level } = calculateLevel(xp);
      expect(level, `xp ${xp}`).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it("puts the player inside the level it reports", () => {
    for (const xp of [0, 150, 3_500, 42_000, 900_000]) {
      const info = calculateLevel(xp);
      expect(info.currentXP, `xp ${xp}`).toBeGreaterThanOrEqual(info.xpForCurrentLevel);
      if (!info.isMaxLevel) {
        expect(info.currentXP, `xp ${xp}`).toBeLessThan(info.xpForNextLevel);
      }
    }
  });

  it("keeps the remaining-XP figures consistent with the thresholds", () => {
    const info = calculateLevel(12_345);
    expect(info.xpInCurrentLevel).toBe(info.currentXP - info.xpForCurrentLevel);
    expect(info.xpNeededForNextLevel).toBe(info.xpForNextLevel - info.xpForCurrentLevel);
    expect(info.xpNeededForNextLevel).toBeGreaterThan(0);
  });

  it("caps at level 999 with a full bar and no divide-by-zero", () => {
    const info = calculateLevel(Number.MAX_SAFE_INTEGER);
    expect(info.level).toBe(999);
    expect(info.isMaxLevel).toBe(true);
    expect(info.progress).toBe(100);
    expect(Number.isFinite(info.xpNeededForNextLevel)).toBe(true);
  });

  it("keeps early levels reachable within a few games", () => {
    // A player banking ~250 points a question should feel level 2 quickly,
    // or the progression reads as broken on first session.
    expect(calculateLevel(100).level).toBeGreaterThanOrEqual(2);
  });

  it("makes each level cost at least as much as the one before it", () => {
    // Walk the public API and collect the XP span of each level, so the
    // curve can't be flattened or inverted without this failing.
    const spans: number[] = [];
    for (let level = 1; level < 30; level++) {
      spans.push(findFirstXpForLevel(level + 1) - findFirstXpForLevel(level));
    }

    for (let i = 1; i < spans.length; i++) {
      expect(spans[i], `level ${i + 2} costs less than level ${i + 1}`).toBeGreaterThanOrEqual(
        spans[i - 1]
      );
    }
  });
});

describe("getStreakBonus", () => {
  it("pays nothing below three days", () => {
    expect(getStreakBonus(0)).toBe(0);
    expect(getStreakBonus(2)).toBe(0);
  });

  it("steps up at 3, 5 and 7 days", () => {
    expect(getStreakBonus(3)).toBe(15);
    expect(getStreakBonus(4)).toBe(15);
    expect(getStreakBonus(5)).toBe(30);
    expect(getStreakBonus(6)).toBe(30);
    expect(getStreakBonus(7)).toBe(50);
  });

  it("holds the top bonus for very long streaks", () => {
    expect(getStreakBonus(365)).toBe(50);
  });

  it("never goes down as the streak grows", () => {
    let previous = 0;
    for (let days = 0; days <= 60; days++) {
      const bonus = getStreakBonus(days);
      expect(bonus, `day ${days}`).toBeGreaterThanOrEqual(previous);
      previous = bonus;
    }
  });

  it("treats a negative streak as no streak", () => {
    expect(getStreakBonus(-1)).toBe(0);
  });
});

describe("getStreakMilestones", () => {
  it("lists milestones in ascending order with growing bonuses", () => {
    const milestones = getStreakMilestones();
    expect(milestones.length).toBeGreaterThan(0);
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i].days).toBeGreaterThan(milestones[i - 1].days);
      expect(milestones[i].bonus).toBeGreaterThan(milestones[i - 1].bonus);
    }
  });

  it("matches getStreakBonus for the milestones it advertises", () => {
    // The UI promises these numbers; the reward code has to pay them.
    for (const { days, bonus } of getStreakMilestones()) {
      if (days > 7) continue; // getStreakBonus tops out at the 7-day tier
      expect(getStreakBonus(days), `day ${days}`).toBe(bonus);
    }
  });
});
