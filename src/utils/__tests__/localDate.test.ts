import { describe, it, expect } from "vitest";
import {
  KA_MONTHS_LONG,
  KA_WEEKDAYS_LONG,
  KA_WEEKDAYS_SHORT,
  formatDayWithWeekday,
  formatWeekdayShort,
  isGeorgian,
} from "@/utils/localDate";

// 2026-08-16 is a Sunday — the date from the report, which rendered as
// "Sunday, Aug 16" inside a Georgian modal.
const AUG_16 = new Date("2026-08-16T00:00:00Z");

describe("formatDayWithWeekday", () => {
  it("writes a Georgian date in Georgian", () => {
    expect(formatDayWithWeekday(AUG_16, "ka", { utc: true })).toBe("კვირა, 16 აგვისტო");
  });

  it("does not go through Intl for Georgian", () => {
    // THE bug, and why the names are hardcoded: browsers ship no Georgian
    // locale data, and Intl answers a missing locale with en-US instead of
    // an error. If this ever routes through toLocaleDateString again, the
    // output silently reverts to English on the devices players use.
    expect(formatDayWithWeekday(AUG_16, "ka", { utc: true })).not.toMatch(/[A-Za-z]/);
  });

  it("still lets Intl handle the languages it does have", () => {
    const german = formatDayWithWeekday(AUG_16, "de", { utc: true });
    expect(german).toMatch(/Sonntag/);
  });

  it("reads UTC parts when asked, so a day never slips by a timezone", () => {
    // The missions modal keys days by an ISO date string. Formatting that in
    // local time puts a player west of UTC on the previous day.
    const midnightUtc = new Date("2026-08-16T00:00:00Z");
    expect(formatDayWithWeekday(midnightUtc, "ka", { utc: true })).toBe("კვირა, 16 აგვისტო");
  });

  it("returns nothing for an unparseable date rather than 'Invalid Date'", () => {
    expect(formatDayWithWeekday(new Date("nonsense"), "ka")).toBe("");
    expect(formatDayWithWeekday(new Date("nonsense"), "en")).toBe("");
  });

  it("covers every weekday and month name", () => {
    // A missing or shifted entry would show the wrong day forever, and only
    // on the one day of the week nobody happened to check.
    expect(KA_WEEKDAYS_LONG).toHaveLength(7);
    expect(KA_MONTHS_LONG).toHaveLength(12);
    for (let month = 0; month < 12; month++) {
      const date = new Date(Date.UTC(2026, month, 15));
      expect(formatDayWithWeekday(date, "ka", { utc: true })).toContain(KA_MONTHS_LONG[month]);
    }
    for (let offset = 0; offset < 7; offset++) {
      // 2026-08-16 is a Sunday, so this walks Sunday through Saturday.
      const date = new Date(Date.UTC(2026, 7, 16 + offset));
      expect(formatDayWithWeekday(date, "ka", { utc: true })).toContain(
        KA_WEEKDAYS_LONG[date.getUTCDay()]
      );
    }
  });
});

describe("formatWeekdayShort", () => {
  it("gives the streak strip Georgian day names", () => {
    expect(formatWeekdayShort(AUG_16, "ka", { utc: true })).toBe("კვი");
    expect(KA_WEEKDAYS_SHORT).toHaveLength(7);
  });

  it("has no Latin letters in the Georgian output", () => {
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(Date.UTC(2026, 7, 16 + offset));
      expect(formatWeekdayShort(date, "ka", { utc: true })).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe("isGeorgian", () => {
  it("matches the tags the app and the browser both use", () => {
    expect(isGeorgian("ka")).toBe(true);
    expect(isGeorgian("ka-GE")).toBe(true);
    expect(isGeorgian("KA")).toBe(true);
  });

  it("does not match another language that merely starts with those letters", () => {
    expect(isGeorgian("kab")).toBe(false);
    expect(isGeorgian("en")).toBe(false);
  });
});
