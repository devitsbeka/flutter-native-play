import { describe, it, expect } from "vitest";
import {
  VIP_DAILY_POWERUPS,
  VIP_MULTIPLIERS,
  calculateXP,
  getMaxDailySpins,
  getVipDailyPowerUps,
  shouldSkipStake,
} from "@/utils/vipMultipliers";

// PRO is a paid tier, so every benefit here is something a player has bought.
// Silently losing one is a refund request.

describe("calculateXP", () => {
  it("doubles XP for PRO members", () => {
    expect(calculateXP(100, true)).toBe(200);
    expect(calculateXP(0, true)).toBe(0);
  });

  it("leaves free players on the base rate", () => {
    expect(calculateXP(100, false)).toBe(100);
  });

  it("never pays a PRO member less than a free player", () => {
    for (const base of [0, 1, 250, 9_999]) {
      expect(calculateXP(base, true)).toBeGreaterThanOrEqual(calculateXP(base, false));
    }
  });
});

describe("getMaxDailySpins", () => {
  it("gives free players a single spin", () => {
    expect(getMaxDailySpins(false)).toBe(VIP_MULTIPLIERS.BASE_SPINS);
    expect(getMaxDailySpins(false)).toBe(1);
  });

  it("gives PRO members the bonus spins on top", () => {
    expect(getMaxDailySpins(true)).toBe(
      VIP_MULTIPLIERS.BASE_SPINS + VIP_MULTIPLIERS.BONUS_SPINS
    );
    expect(getMaxDailySpins(true)).toBe(4);
  });
});

describe("shouldSkipStake", () => {
  it("lets PRO members play without paying the stake", () => {
    expect(shouldSkipStake(true)).toBe(true);
  });

  it("still charges free players", () => {
    expect(shouldSkipStake(false)).toBe(false);
  });
});

describe("getVipDailyPowerUps", () => {
  it("grants one of each power-up a day", () => {
    expect(getVipDailyPowerUps()).toEqual({
      FREEZE: 1,
      FIFTY_FIFTY: 1,
      REPLACE: 1,
      TIME_DRAIN: 1,
    });
  });

  it("returns a copy so a caller cannot mutate the grant table", () => {
    const grant = getVipDailyPowerUps();
    grant.FREEZE = 99;
    expect(VIP_DAILY_POWERUPS.FREEZE).toBe(1);
    expect(getVipDailyPowerUps().FREEZE).toBe(1);
  });

  it("covers all four power-ups", () => {
    expect(Object.keys(getVipDailyPowerUps())).toHaveLength(4);
  });
});
