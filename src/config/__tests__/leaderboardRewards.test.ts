import { describe, it, expect, afterEach, vi } from "vitest";
import {
  EXCLUSIVE_FRAMES,
  LEADERBOARD_BADGES,
  WEEKLY_LEADERBOARD_REWARDS,
  getCurrentWeekBounds,
  getDaysRemainingInWeek,
  getRewardForRank,
  ranksForRewards,
} from "@/config/leaderboardRewards";
import { REWARDS } from "@/config/rewardConfig";

afterEach(() => {
  vi.useRealTimers();
});

describe("weekly reward table", () => {
  it("pays the top ten and nobody else", () => {
    expect(WEEKLY_LEADERBOARD_REWARDS).toHaveLength(10);
    expect(ranksForRewards()).toBe(10);
  });

  it("covers ranks 1..10 exactly once each, in order", () => {
    WEEKLY_LEADERBOARD_REWARDS.forEach((reward, index) => {
      expect(reward.rank).toBe(index + 1);
    });
  });

  it("never pays a lower rank more than a higher one", () => {
    const value = (r: (typeof WEEKLY_LEADERBOARD_REWARDS)[number]) =>
      r.coins + r.gems * REWARDS.GEM_TO_COINS_RATE;

    for (let i = 1; i < WEEKLY_LEADERBOARD_REWARDS.length; i++) {
      expect(
        value(WEEKLY_LEADERBOARD_REWARDS[i]),
        `rank ${i + 1} pays more than rank ${i}`
      ).toBeLessThan(value(WEEKLY_LEADERBOARD_REWARDS[i - 1]));
    }
  });

  it("pays every winning rank something", () => {
    for (const reward of WEEKLY_LEADERBOARD_REWARDS) {
      expect(reward.coins + reward.gems, `rank ${reward.rank}`).toBeGreaterThan(0);
      expect(Number.isInteger(reward.coins), `rank ${reward.rank} coins`).toBe(true);
      expect(Number.isInteger(reward.gems), `rank ${reward.rank} gems`).toBe(true);
    }
  });

  it("keeps the weekly first prize under a month of PRO", () => {
    // A weekly prize worth more than the top purchase would undercut the shop.
    const first = WEEKLY_LEADERBOARD_REWARDS[0];
    const firstValue = first.coins + first.gems * REWARDS.GEM_TO_COINS_RATE;
    expect(firstValue).toBeLessThan(REWARDS.VIP_PRICES.month * REWARDS.GEM_TO_COINS_RATE);
  });

  it("awards frames and badges to the podium only", () => {
    for (const reward of WEEKLY_LEADERBOARD_REWARDS) {
      if (reward.rank <= 3) {
        expect(reward.frameId, `rank ${reward.rank}`).toBeTruthy();
        expect(reward.badgeId, `rank ${reward.rank}`).toBeTruthy();
      } else {
        expect(reward.frameId, `rank ${reward.rank}`).toBeUndefined();
        expect(reward.badgeId, `rank ${reward.rank}`).toBeUndefined();
      }
    }
  });
});

describe("reward / frame / badge cross-references", () => {
  it("only promises frames that actually exist", () => {
    const frameIds = new Set(EXCLUSIVE_FRAMES.map((f) => f.id));
    for (const reward of WEEKLY_LEADERBOARD_REWARDS) {
      if (!reward.frameId) continue;
      expect(frameIds.has(reward.frameId), `missing frame ${reward.frameId}`).toBe(true);
    }
  });

  it("only promises badges that actually exist", () => {
    const badgeIds = new Set(LEADERBOARD_BADGES.map((b) => b.id));
    for (const reward of WEEKLY_LEADERBOARD_REWARDS) {
      if (!reward.badgeId) continue;
      expect(badgeIds.has(reward.badgeId), `missing badge ${reward.badgeId}`).toBe(true);
    }
  });

  it("matches each frame and badge to the rank that earns it", () => {
    for (const frame of EXCLUSIVE_FRAMES) {
      const reward = getRewardForRank(frame.rankRequirement);
      expect(reward?.frameId, `frame ${frame.id}`).toBe(frame.id);
    }
    for (const badge of LEADERBOARD_BADGES) {
      const reward = getRewardForRank(badge.rankRequirement);
      expect(reward?.badgeId, `badge ${badge.id}`).toBe(badge.id);
    }
  });

  it("uses unique ids for frames and badges", () => {
    expect(new Set(EXCLUSIVE_FRAMES.map((f) => f.id)).size).toBe(EXCLUSIVE_FRAMES.length);
    expect(new Set(LEADERBOARD_BADGES.map((b) => b.id)).size).toBe(LEADERBOARD_BADGES.length);
  });
});

describe("getRewardForRank", () => {
  it("returns the matching row for a paid rank", () => {
    expect(getRewardForRank(1)?.coins).toBe(2000);
    expect(getRewardForRank(10)?.coins).toBe(150);
  });

  it("returns null outside the paid ranks rather than throwing", () => {
    // 11th place must get nothing, not undefined-shaped nothing.
    expect(getRewardForRank(11)).toBeNull();
    expect(getRewardForRank(0)).toBeNull();
    expect(getRewardForRank(-1)).toBeNull();
    expect(getRewardForRank(9999)).toBeNull();
  });
});

describe("getCurrentWeekBounds", () => {
  const bounds = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return getCurrentWeekBounds();
  };

  it("runs Monday 00:00 to Sunday 23:59:59.999", () => {
    const { start, end } = bounds("2026-08-12T15:00:00"); // Wednesday
    expect(start.getDay()).toBe(1);
    expect(end.getDay()).toBe(0);
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([23, 59, 59]);
    expect(end.getMilliseconds()).toBe(999);
  });

  it("puts Sunday in the week that started six days earlier, not the next one", () => {
    // The classic off-by-one: JS getDay() makes Sunday 0, so a naive
    // `now - (day - 1)` would jump Sunday forward into the coming week.
    const { start, end } = bounds("2026-08-09T12:00:00"); // Sunday
    expect(start.getDate()).toBe(3); // Monday 3 Aug
    expect(end.getDate()).toBe(9); // the same Sunday
  });

  it("treats Monday itself as the start of its own week", () => {
    const { start } = bounds("2026-08-10T00:00:01"); // Monday
    expect(start.getDate()).toBe(10);
  });

  it("spans a month boundary correctly", () => {
    const { start, end } = bounds("2026-09-02T12:00:00"); // Wednesday
    expect(start.getMonth()).toBe(7); // August
    expect(start.getDate()).toBe(31);
    expect(end.getMonth()).toBe(8); // September
    expect(end.getDate()).toBe(6);
  });

  it("always spans exactly seven days", () => {
    for (const day of ["09", "10", "11", "12", "13", "14", "15"]) {
      const { start, end } = bounds(`2026-08-${day}T12:00:00`);
      const spanDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      expect(spanDays, `from 2026-08-${day}`).toBeCloseTo(7, 3);
      expect(end.getTime(), `from 2026-08-${day}`).toBeGreaterThan(start.getTime());
    }
  });

  it("always contains the moment it was asked about", () => {
    for (const iso of [
      "2026-08-09T23:59:59",
      "2026-08-10T00:00:00",
      "2026-12-31T18:00:00",
      "2027-01-01T06:00:00",
    ]) {
      const now = new Date(iso).getTime();
      const { start, end } = bounds(iso);
      expect(start.getTime(), iso).toBeLessThanOrEqual(now);
      expect(end.getTime(), iso).toBeGreaterThanOrEqual(now);
    }
  });
});

describe("getDaysRemainingInWeek", () => {
  const at = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return getDaysRemainingInWeek();
  };

  it("counts down through the week", () => {
    expect(at("2026-08-10T00:00:00")).toBe(7); // Monday
    expect(at("2026-08-15T12:00:00")).toBe(2); // Saturday
    expect(at("2026-08-09T22:00:00")).toBe(1); // Sunday evening
  });

  it("never reports zero or negative days while the week is running", () => {
    for (const day of ["09", "10", "11", "12", "13", "14", "15"]) {
      expect(at(`2026-08-${day}T12:00:00`), `2026-08-${day}`).toBeGreaterThan(0);
    }
  });

  it("never reports more than seven days", () => {
    for (const day of ["09", "10", "11", "12", "13", "14", "15"]) {
      expect(at(`2026-08-${day}T00:00:01`), `2026-08-${day}`).toBeLessThanOrEqual(7);
    }
  });
});
