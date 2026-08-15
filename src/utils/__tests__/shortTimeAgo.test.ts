import { describe, it, expect } from "vitest";
import { shortTimeAgo } from "../shortTimeAgo";
import { translations } from "@/locales";

/**
 * A timestamp in a list has one job and one constraint: say roughly when, and
 * never be the reason the title beside it wraps.
 */

/** The real locale strings, so a missing or renamed key fails here. */
const translator = (lang: "ka" | "en") => (key: string, vars?: Record<string, string | number>) => {
  const dict = translations[lang] as Record<string, Record<string, string>>;
  const [ns, name] = key.split(".");
  const raw = dict[ns]?.[name];
  if (typeof raw !== "string") throw new Error(`missing ${lang} string: ${key}`);
  return Object.entries(vars ?? {}).reduce(
    (out, [k, v]) => out.replace(`{${k}}`, String(v)),
    raw,
  );
};

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);
const ago = (ms: number, lang: "ka" | "en" = "ka") =>
  shortTimeAgo(new Date(NOW - ms).toISOString(), translator(lang), NOW);

const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe("shortTimeAgo", () => {
  it("never says less than a minute — under a minute is 1", () => {
    // The whole reason this exists: date-fns returned "1 წუთზე ნაკლები" for a
    // thirty-second-old row, fifteen characters on the title's line.
    expect(ago(0)).toBe("1წთ");
    expect(ago(30 * SEC)).toBe("1წთ");
    expect(ago(59 * SEC)).toBe("1წთ");
  });

  it("counts minutes, then hours, then days", () => {
    expect(ago(MIN)).toBe("1წთ");
    expect(ago(59 * MIN)).toBe("59წთ");
    expect(ago(HOUR)).toBe("1სთ");
    expect(ago(23 * HOUR)).toBe("23სთ");
    expect(ago(DAY)).toBe("1დღე");
    expect(ago(6 * DAY)).toBe("6დღე");
  });

  it("moves up to weeks, months and years", () => {
    expect(ago(7 * DAY)).toBe("1კვ");
    expect(ago(29 * DAY)).toBe("4კვ");
    expect(ago(30 * DAY)).toBe("1თვე");
    expect(ago(364 * DAY)).toBe("12თვე");
    expect(ago(365 * DAY)).toBe("1წ");
    expect(ago(800 * DAY)).toBe("2წ");
  });

  it("stays short in every unit and both languages", () => {
    // The constraint, stated as a test: the timestamp is whitespace-nowrap
    // beside the title, so its width is the title's loss.
    const spans = [0, 45 * MIN, 5 * HOUR, 3 * DAY, 2 * 7 * DAY, 90 * DAY, 400 * DAY];
    for (const lang of ["ka", "en"] as const) {
      for (const span of spans) {
        expect(ago(span, lang).length, `${lang} @ ${span}ms`).toBeLessThanOrEqual(6);
      }
    }
  });

  it("reads a clock that is ahead of the server as just now", () => {
    expect(ago(-30 * SEC)).toBe("1წთ");
  });

  it("returns nothing for a date it cannot read", () => {
    expect(shortTimeAgo("not a date", translator("ka"), NOW)).toBe("");
  });
});
