import { describe, it, expect } from "vitest";
import {
  BONUS_POWER_UPS,
  dayKindOf,
  rotationByTier,
  rotationForDate,
  weekBonusPowerUp,
  weekStartOf,
} from "@/utils/missionDays";

// Stands in for the real daily pool: the rotation must not care what it is
// rotating, only that a date always lands on the same slice.
const POOL = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"];
const dailyPoolForDate = (date: string) =>
  rotationForDate(POOL, date, 5).map((id) => ({ mission_id: id }));

describe("dayKindOf", () => {
  it("separates the day you can act on from the ones you cannot", () => {
    expect(dayKindOf("2026-08-12", "2026-08-12")).toBe("today");
    expect(dayKindOf("2026-08-11", "2026-08-12")).toBe("past");
    expect(dayKindOf("2026-08-13", "2026-08-12")).toBe("future");
  });

  it("compares whole dates, not month or day numbers", () => {
    // Lexical compare on ISO dates is only right because the parts are
    // zero-padded and ordered widest-first — worth pinning, since "9" > "10"
    // would put September before October.
    expect(dayKindOf("2026-09-01", "2026-10-01")).toBe("past");
    expect(dayKindOf("2026-12-31", "2027-01-01")).toBe("past");
    expect(dayKindOf("2027-01-01", "2026-12-31")).toBe("future");
  });
});

describe("dailyPoolForDate", () => {
  it("gives a day the same five missions every time it is asked", () => {
    const a = dailyPoolForDate("2026-08-12").map((m) => m.mission_id);
    const b = dailyPoolForDate("2026-08-12").map((m) => m.mission_id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
  });

  it("gives neighbouring days different sets", () => {
    // The whole point of the rotation: opening tomorrow should not show
    // today's list back.
    const today = dailyPoolForDate("2026-08-12").map((m) => m.mission_id);
    const tomorrow = dailyPoolForDate("2026-08-13").map((m) => m.mission_id);
    expect(tomorrow).not.toEqual(today);
  });

  it("works the same for past and future dates", () => {
    expect(dailyPoolForDate("2025-01-01")).toHaveLength(5);
    expect(dailyPoolForDate("2030-06-15")).toHaveLength(5);
  });

  it("never repeats a mission within one day", () => {
    for (const date of ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"]) {
      const ids = dailyPoolForDate(date).map((m) => m.mission_id);
      expect(new Set(ids).size, date).toBe(ids.length);
    }
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of that week", () => {
    // 2026-08-12 is a Wednesday.
    expect(weekStartOf("2026-08-12")).toBe("2026-08-10");
    expect(weekStartOf("2026-08-10")).toBe("2026-08-10");
  });

  it("counts Sunday as the end of its week, not the start", () => {
    // getUTCDay() calls Sunday 0, so an unshifted week would jump forward a
    // day here and split the weekend across two weeks.
    expect(weekStartOf("2026-08-16")).toBe("2026-08-10");
  });

  it("crosses a month and a year boundary", () => {
    expect(weekStartOf("2026-09-02")).toBe("2026-08-31");
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28");
  });
});

describe("weekBonusPowerUp", () => {
  it("is stable for a given week", () => {
    expect(weekBonusPowerUp("2026-08-10")).toBe(weekBonusPowerUp("2026-08-10"));
  });

  it("varies across weeks", () => {
    const weeks = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    expect(new Set(weeks.map(weekBonusPowerUp)).size).toBeGreaterThan(1);
  });

  it("always names a real power-up", () => {
    const known = new Set<string>(BONUS_POWER_UPS);
    for (let i = 0; i < 40; i++) {
      const week = new Date(Date.UTC(2026, 0, 5) + i * 7 * 86_400_000).toISOString().slice(0, 10);
      expect(known.has(weekBonusPowerUp(week)), week).toBe(true);
    }
  });
});

describe("rotationByTier", () => {
  const POOL_BY_TIER = [
    { id: "one", difficulty: 1 },
    { id: "m1", difficulty: 2 },
    { id: "m2", difficulty: 2 },
    { id: "m3", difficulty: 2 },
    { id: "h1", difficulty: 3 },
    { id: "h2", difficulty: 3 },
    { id: "x1", difficulty: 4 },
    { id: "x2", difficulty: 4 },
    { id: "x3", difficulty: 4 },
  ];

  it("runs one mission per tier, easiest first", () => {
    for (const date of ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"]) {
      const day = rotationByTier(POOL_BY_TIER, date);
      expect(day.map((m) => m.difficulty), date).toEqual([1, 2, 3, 4]);
    }
  });

  it("always opens with the only tier-one mission", () => {
    // The streak keeper: whatever else the day asks, playing once is on it.
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.UTC(2026, 7, 10) + i * 86_400_000).toISOString().slice(0, 10);
      expect(rotationByTier(POOL_BY_TIER, date)[0].id).toBe("one");
    }
  });

  it("rotates each tier across the days", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const date = new Date(Date.UTC(2026, 7, 10) + i * 86_400_000).toISOString().slice(0, 10);
      seen.add(rotationByTier(POOL_BY_TIER, date)[3].id);
    }
    expect(seen).toEqual(new Set(["x1", "x2", "x3"]));
  });

  it("is stable for a date", () => {
    expect(rotationByTier(POOL_BY_TIER, "2026-08-12")).toEqual(rotationByTier(POOL_BY_TIER, "2026-08-12"));
  });
});
