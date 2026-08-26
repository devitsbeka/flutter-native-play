import { describe, it, expect } from "vitest";
import { rewardISO, weekOf } from "@/components/home/DailyRewardsModal";

/**
 * The daily-rewards row is a calendar week, and calendars are where timezone
 * bugs live. This file used to assert the opposite of what it asserts now, so
 * it is worth writing down why.
 *
 * The old rule was "use the LOCAL date, because a claim made on Tuesday
 * evening must not paint Wednesday's card green". True as far as it went, and
 * it fixed the symptom somebody had actually seen — but it made this screen
 * the only part of the feature on the device's calendar. The other three are
 * on UTC:
 *
 *   claim_daily_reward   reward_date := CURRENT_DATE   (Postgres, UTC)
 *   useRewardTimers      new Date().toISOString()      (UTC)
 *   dailyResetCountdown  setUTCHours(24, 0, 0, 0)      (UTC)
 *
 * East of UTC, between local midnight and the offset, the local date is
 * already tomorrow while the row holding today's claim is stamped yesterday.
 * So the card this screen called "today" found no claim and drew a Claim
 * button, while the timer — reading the right row — disabled it. A Claim you
 * cannot press, over a running countdown. At UTC+4 that is 00:00 to 04:00
 * every night.
 *
 * Whichever calendar is chosen, it has to be the database's, because the
 * database writes the row and cannot be told otherwise from here.
 *
 * The other rule is unchanged: weekOf starts on Monday whatever weekday today
 * is, Sunday included — getDay() calls Sunday 0, the classic off-by-one.
 */
describe("daily rewards week", () => {
  it("keys a day the way the database does", () => {
    // 23:30 UTC on the 15th is still the 15th; ten past midnight UTC is the
    // 16th. Same instants the old test used, read on the calendar that owns
    // the row.
    expect(rewardISO(new Date(Date.UTC(2026, 7, 15, 23, 30)))).toBe("2026-08-15");
    expect(rewardISO(new Date(Date.UTC(2026, 7, 16, 0, 10)))).toBe("2026-08-16");
  });

  it("agrees with the lookup useRewardTimers does", () => {
    // fetchRewardData asks for `new Date().toISOString().split("T")[0]`. If
    // these two ever diverge again, the screen and the timer go back to
    // describing different days.
    const now = new Date(Date.UTC(2026, 7, 16, 2, 0));
    expect(rewardISO(now)).toBe(now.toISOString().split("T")[0]);
  });

  it("pads months and days", () => {
    expect(rewardISO(new Date(Date.UTC(2026, 0, 5, 12)))).toBe("2026-01-05");
  });

  it("the week always runs Monday to Sunday", () => {
    // 2026-08-19 is a Wednesday; its week is Mon 17 .. Sun 23.
    const wednesday = new Date(Date.UTC(2026, 7, 19, 12));
    const week = weekOf(wednesday);
    expect(week).toHaveLength(7);
    expect(rewardISO(week[0])).toBe("2026-08-17");
    expect(rewardISO(week[6])).toBe("2026-08-23");
    expect(week[0].getUTCDay()).toBe(1); // Monday
    expect(week[6].getUTCDay()).toBe(0); // Sunday
  });

  it("Sunday belongs to the week that STARTED the previous Monday", () => {
    const sunday = new Date(Date.UTC(2026, 7, 23, 12));
    const week = weekOf(sunday);
    expect(rewardISO(week[0])).toBe("2026-08-17");
    expect(rewardISO(week[6])).toBe("2026-08-23");
  });

  it("Monday starts its own week", () => {
    const monday = new Date(Date.UTC(2026, 7, 17, 0, 5));
    expect(rewardISO(weekOf(monday)[0])).toBe("2026-08-17");
  });

  it("a week crossing a month boundary stays consecutive", () => {
    const tuesday = new Date(Date.UTC(2026, 8, 1, 12)); // Tue 1 Sep 2026
    const week = weekOf(tuesday);
    expect(rewardISO(week[0])).toBe("2026-08-31");
    expect(rewardISO(week[6])).toBe("2026-09-06");
  });

  it("holds the week together from a moment where local and UTC disagree", () => {
    // 01:00 UTC on Monday the 17th is Sunday the 16th at 21:00 in New York
    // and Monday at 05:00 in Tbilisi. The week must be the UTC one from
    // either chair, or the row of cards shifts by a day depending on who is
    // looking at it.
    const week = weekOf(new Date(Date.UTC(2026, 7, 17, 1, 0)));
    expect(rewardISO(week[0])).toBe("2026-08-17");
    expect(rewardISO(week[6])).toBe("2026-08-23");
  });
});
