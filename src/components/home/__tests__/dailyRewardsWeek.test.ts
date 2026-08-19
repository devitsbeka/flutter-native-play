import { describe, it, expect } from "vitest";
import { localISO, weekOf } from "@/components/home/DailyRewardsModal";

/**
 * The daily-rewards row became a calendar week, and calendars are where
 * timezone bugs live. Two rules the cards depend on:
 *
 *  - localISO must be the LOCAL date. toISOString shifts through UTC, and a
 *    claim made on Tuesday evening must not paint Wednesday's card green.
 *  - weekOf must start on Monday whatever weekday today is, Sunday included —
 *    getDay() calls Sunday 0, which is the classic off-by-one.
 */
describe("daily rewards week", () => {
  it("localISO is the local date, not the UTC one", () => {
    const lateEvening = new Date(2026, 7, 15, 23, 30);
    expect(localISO(lateEvening)).toBe("2026-08-15");
    const justAfterMidnight = new Date(2026, 7, 16, 0, 10);
    expect(localISO(justAfterMidnight)).toBe("2026-08-16");
  });

  it("pads months and days", () => {
    expect(localISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("the week always runs Monday to Sunday", () => {
    // 2026-08-19 is a Wednesday; its week is Mon 17 .. Sun 23.
    const wednesday = new Date(2026, 7, 19, 12);
    const week = weekOf(wednesday);
    expect(week).toHaveLength(7);
    expect(localISO(week[0])).toBe("2026-08-17");
    expect(localISO(week[6])).toBe("2026-08-23");
    expect(week[0].getDay()).toBe(1); // Monday
    expect(week[6].getDay()).toBe(0); // Sunday
  });

  it("Sunday belongs to the week that STARTED the previous Monday", () => {
    const sunday = new Date(2026, 7, 23, 12);
    const week = weekOf(sunday);
    expect(localISO(week[0])).toBe("2026-08-17");
    expect(localISO(week[6])).toBe("2026-08-23");
  });

  it("Monday starts its own week", () => {
    const monday = new Date(2026, 7, 17, 0, 5);
    expect(localISO(weekOf(monday)[0])).toBe("2026-08-17");
  });

  it("a week crossing a month boundary stays consecutive", () => {
    const tuesday = new Date(2026, 8, 1, 12); // Tue 1 Sep 2026
    const week = weekOf(tuesday);
    expect(localISO(week[0])).toBe("2026-08-31");
    expect(localISO(week[6])).toBe("2026-09-06");
  });
});
