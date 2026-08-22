import { describe, it, expect } from "vitest";
import {
  CHEST_COOLDOWN_MS,
  chestCooldownStatus,
  dailyResetCountdown,
  formatTimeDiff,
} from "@/utils/rewardTimers";
import { REWARDS } from "@/config/rewardConfig";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatTimeDiff", () => {
  it("zero-pads every segment", () => {
    expect(formatTimeDiff(HOUR + MINUTE + SECOND).timeLeft).toBe("01:01:01");
    expect(formatTimeDiff(9 * SECOND).timeLeft).toBe("00:00:09");
  });

  it("shows a full day without rolling over", () => {
    expect(formatTimeDiff(23 * HOUR + 59 * MINUTE + 59 * SECOND).timeLeft).toBe("23:59:59");
  });

  it("reports zero for an elapsed or negative countdown", () => {
    expect(formatTimeDiff(0)).toEqual({ timeLeft: "00:00:00", secondsLeft: 0 });
    expect(formatTimeDiff(-5000)).toEqual({ timeLeft: "00:00:00", secondsLeft: 0 });
  });

  it("keeps secondsLeft consistent with the label", () => {
    const parts = formatTimeDiff(2 * HOUR + 3 * MINUTE + 4 * SECOND);
    expect(parts.secondsLeft).toBe(2 * 3600 + 3 * 60 + 4);
    expect(parts.timeLeft).toBe("02:03:04");
  });

  it("rounds down rather than showing a second that has not elapsed", () => {
    expect(formatTimeDiff(1999).timeLeft).toBe("00:00:01");
    expect(formatTimeDiff(1999).secondsLeft).toBe(1);
  });
});

describe("dailyResetCountdown", () => {
  // claim_daily_reward gates on the server's CURRENT_DATE (UTC), so the
  // countdown targets UTC midnight — the moment a new claim actually works —
  // whatever timezone the player (or this test runner) sits in.
  it("counts down to UTC midnight", () => {
    const now = new Date(Date.UTC(2026, 7, 10, 23, 30, 0));
    expect(dailyResetCountdown(now).timeLeft).toBe("00:30:00");
  });

  it("shows nearly a full day just after UTC midnight", () => {
    const now = new Date(Date.UTC(2026, 7, 10, 0, 0, 1));
    expect(dailyResetCountdown(now).timeLeft).toBe("23:59:59");
  });

  it("never exceeds 24 hours", () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      const parts = dailyResetCountdown(new Date(Date.UTC(2026, 7, 10, hour, 0, 0)));
      expect(parts.secondsLeft, `hour ${hour}`).toBeLessThanOrEqual(24 * 3600);
      expect(parts.secondsLeft, `hour ${hour}`).toBeGreaterThan(0);
    }
  });

  it("does not mutate the date it was given", () => {
    const now = new Date(2026, 7, 10, 12, 0, 0);
    const snapshot = now.getTime();
    dailyResetCountdown(now);
    expect(now.getTime()).toBe(snapshot);
  });
});

describe("chestCooldownStatus", () => {
  const now = new Date(2026, 7, 10, 12, 0, 0);

  it("is claimable for a player who has never opened one", () => {
    expect(chestCooldownStatus(null, now).canClaim).toBe(true);
    expect(chestCooldownStatus(undefined, now).canClaim).toBe(true);
    expect(chestCooldownStatus(null, now).timeLeft).toBe("00:00:00");
  });

  it("locks for the full cooldown after opening", () => {
    const justOpened = new Date(now.getTime()).toISOString();
    const status = chestCooldownStatus(justOpened, now);
    expect(status.canClaim).toBe(false);
    expect(status.secondsLeft).toBe(REWARDS.CHEST_COOLDOWN_HOURS * 3600);
  });

  it("unlocks exactly at the end of the cooldown, not a tick later", () => {
    const oneMsEarly = new Date(now.getTime() - CHEST_COOLDOWN_MS + 1).toISOString();
    expect(chestCooldownStatus(oneMsEarly, now).canClaim).toBe(false);

    const exactlyDue = new Date(now.getTime() - CHEST_COOLDOWN_MS).toISOString();
    expect(chestCooldownStatus(exactlyDue, now).canClaim).toBe(true);
  });

  it("stays claimable long after the cooldown lapsed", () => {
    const lastWeek = new Date(now.getTime() - 7 * 24 * HOUR).toISOString();
    expect(chestCooldownStatus(lastWeek, now).canClaim).toBe(true);
  });

  it("shows a shrinking countdown as the cooldown burns down", () => {
    const sixHoursIn = new Date(now.getTime() - 6 * HOUR).toISOString();
    const status = chestCooldownStatus(sixHoursIn, now);
    expect(status.timeLeft).toBe("18:00:00");
  });

  it("does not lock the chest forever on an unparseable timestamp", () => {
    // A bad row must not cost the player their chest permanently.
    expect(chestCooldownStatus("not-a-date", now).canClaim).toBe(true);
    expect(chestCooldownStatus("", now).canClaim).toBe(true);
  });

  it("reads its cooldown from the reward config", () => {
    // useRewardTimers used to hardcode 24 here; this keeps them together.
    expect(CHEST_COOLDOWN_MS).toBe(REWARDS.CHEST_COOLDOWN_HOURS * HOUR);
  });
});
