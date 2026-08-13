import { describe, it, expect } from "vitest";
import { roomAgeLabel } from "@/utils/roomAge";
import { translations } from "@/locales";

// The card badge used to read "waiting" on every room, which said nothing
// about which room was which. It carries the room's age instead.

const NOW = Date.UTC(2026, 7, 12, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe("roomAgeLabel", () => {
  it("reads as just now under a minute", () => {
    expect(roomAgeLabel(ago(20_000), NOW)).toEqual({ key: "extra.timeJustNow" });
  });

  it("counts minutes, then hours", () => {
    expect(roomAgeLabel(ago(20 * MIN), NOW)).toEqual({ key: "extra.timeMinutesAgo", count: 20 });
    expect(roomAgeLabel(ago(3 * HOUR), NOW)).toEqual({ key: "extra.timeHoursAgo", count: 3 });
  });

  it("says yesterday for one day, then counts days and weeks", () => {
    expect(roomAgeLabel(ago(DAY + HOUR), NOW)).toEqual({ key: "extra.timeYesterday" });
    expect(roomAgeLabel(ago(4 * DAY), NOW)).toEqual({ key: "extra.timeDaysAgo", count: 4 });
    expect(roomAgeLabel(ago(20 * DAY), NOW)).toEqual({ key: "extra.timeWeeksAgo", count: 2 });
  });

  it("turns over to months rather than counting weeks forever", () => {
    // "9 კვირის წინ" is a number to divide, not a fact.
    expect(roomAgeLabel(ago(29 * DAY), NOW)).toEqual({ key: "extra.timeWeeksAgo", count: 4 });
    expect(roomAgeLabel(ago(70 * DAY), NOW)).toEqual({ key: "extra.timeMonthsAgo", count: 2 });
  });

  it("never reports a negative age from a skewed clock", () => {
    expect(roomAgeLabel(new Date(NOW + 5 * MIN).toISOString(), NOW)).toEqual({ key: "extra.timeJustNow" });
  });

  it("returns nothing without a usable timestamp", () => {
    expect(roomAgeLabel(null, NOW)).toBeNull();
    expect(roomAgeLabel("", NOW)).toBeNull();
    expect(roomAgeLabel("not a date", NOW)).toBeNull();
  });

  // The badge renders t(key) with {count} substituted, so the keys have to
  // exist and carry the placeholder — otherwise the corner reads
  // "{count} წუთის წინ".
  it("resolves to real text in both languages", () => {
    const render = (lang: "ka" | "en", createdAt: string) => {
      const label = roomAgeLabel(createdAt, NOW)!;
      const flat = (translations as any)[lang].extra as Record<string, string>;
      const text = flat[label.key.replace("extra.", "")];
      return label.count === undefined ? text : text.replace("{count}", String(label.count));
    };

    expect(render("ka", ago(20 * MIN))).toBe("20 წუთის წინ");
    expect(render("ka", ago(3 * HOUR))).toBe("3 საათის წინ");
    expect(render("ka", ago(20 * DAY))).toBe("2 კვირის წინ");
    expect(render("ka", ago(DAY + HOUR))).toBe("გუშინ");
    expect(render("en", ago(30_000))).toBe("just now");
  });
});
