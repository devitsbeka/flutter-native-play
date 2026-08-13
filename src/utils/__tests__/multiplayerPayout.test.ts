import { describe, it, expect } from "vitest";
import { calculateMultiplayerPayout, nextStreak } from "@/utils/multiplayerPayout";
import { REWARDS } from "@/config/rewardConfig";

describe("calculateMultiplayerPayout — practice rooms", () => {
  it("pays nothing and records nothing for a solo room", () => {
    // A one-player "room" would otherwise be a free coin and win farm.
    expect(calculateMultiplayerPayout({ playerCount: 1, myRank: 1, myScore: 900, isWin: true })).toEqual({
      earnedCoins: 0,
      isPractice: true,
      countsAsWin: false,
    });
  });

  it("treats an empty participant list as practice rather than crashing", () => {
    const payout = calculateMultiplayerPayout({ playerCount: 0, myRank: 1, myScore: 500, isWin: true });
    expect(payout.isPractice).toBe(true);
    expect(payout.earnedCoins).toBe(0);
  });
});

describe("calculateMultiplayerPayout — placement", () => {
  it("pays the winner per opponent beaten, plus their score", () => {
    const payout = calculateMultiplayerPayout({ playerCount: 4, myRank: 1, myScore: 700, isWin: true });
    // 3 beaten × 500 = 1500, capped at 1000, + 700 score
    expect(payout.earnedCoins).toBe(REWARDS.MULTIPLAYER_1ST_COINS + 700);
    expect(payout.countsAsWin).toBe(true);
  });

  it("pays a duel winner less than an eight-player winner", () => {
    const duel = calculateMultiplayerPayout({ playerCount: 2, myRank: 1, myScore: 0, isWin: true });
    const big = calculateMultiplayerPayout({ playerCount: 8, myRank: 1, myScore: 0, isWin: true });
    expect(duel.earnedCoins).toBe(REWARDS.MULTIPLAYER_WIN_COINS_PER_BEATEN);
    expect(big.earnedCoins).toBeGreaterThan(duel.earnedCoins);
  });

  it("caps the placement bonus no matter how large the room", () => {
    const payout = calculateMultiplayerPayout({ playerCount: 100, myRank: 1, myScore: 0, isWin: true });
    expect(payout.earnedCoins).toBe(REWARDS.MULTIPLAYER_1ST_COINS);
  });

  it("pays 2nd and 3rd half their score", () => {
    expect(
      calculateMultiplayerPayout({ playerCount: 5, myRank: 2, myScore: 601, isWin: false }).earnedCoins
    ).toBe(300);
    expect(
      calculateMultiplayerPayout({ playerCount: 5, myRank: 3, myScore: 400, isWin: false }).earnedCoins
    ).toBe(200);
  });

  it("pays everyone below 3rd the flat participation amount", () => {
    for (const rank of [4, 5, 8]) {
      expect(
        calculateMultiplayerPayout({ playerCount: 8, myRank: rank, myScore: 999, isWin: false }).earnedCoins
      ).toBe(REWARDS.MULTIPLAYER_PARTICIPATION_COINS);
    }
  });

  it("never pays a negative amount", () => {
    for (let playerCount = 1; playerCount <= 8; playerCount++) {
      for (let myRank = 1; myRank <= playerCount; myRank++) {
        const { earnedCoins } = calculateMultiplayerPayout({
          playerCount,
          myRank,
          myScore: 0,
          isWin: myRank === 1,
        });
        expect(earnedCoins, `${playerCount}p rank ${myRank}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("survives a rank beyond the player count without paying a bonus", () => {
    // Defensive: stale participant lists have produced rank > count before.
    const payout = calculateMultiplayerPayout({ playerCount: 2, myRank: 5, myScore: 100, isWin: false });
    expect(payout.earnedCoins).toBe(REWARDS.MULTIPLAYER_PARTICIPATION_COINS);
  });
});

describe("nextStreak", () => {
  it("extends the streak on a real win", () => {
    expect(nextStreak(4, true, false)).toBe(5);
  });

  it("resets the streak on a real loss", () => {
    expect(nextStreak(4, false, false)).toBe(0);
  });

  it("leaves the streak untouched after practice", () => {
    // Practice must neither build nor break a streak.
    expect(nextStreak(4, false, true)).toBe(4);
    expect(nextStreak(0, false, true)).toBe(0);
  });
});
