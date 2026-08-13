import { describe, it, expect } from "vitest";
import { resolveMatchOutcome } from "@/utils/matchOutcome";

describe("resolveMatchOutcome", () => {
  it("gives the win to a higher score backed by a correct answer", () => {
    expect(resolveMatchOutcome({ userScore: 400, opponentScore: 200, userCorrect: 2 })).toEqual({
      isWin: true,
      isDraw: false,
      isLose: false,
    });
  });

  it("refuses the win when the player answered nothing correctly", () => {
    // The rule that matters: leading on score is not enough. A player who
    // got every question wrong must never see a victory screen or bank a
    // win, no matter how the score landed.
    const outcome = resolveMatchOutcome({ userScore: 100, opponentScore: 0, userCorrect: 0 });
    expect(outcome.isWin).toBe(false);
    expect(outcome.isDraw).toBe(true);
    expect(outcome.isLose).toBe(false);
  });

  it("calls equal scores a draw", () => {
    expect(resolveMatchOutcome({ userScore: 300, opponentScore: 300, userCorrect: 2 })).toEqual({
      isWin: false,
      isDraw: true,
      isLose: false,
    });
  });

  it("calls a draw when both players scored nothing", () => {
    expect(resolveMatchOutcome({ userScore: 0, opponentScore: 0, userCorrect: 0 })).toEqual({
      isWin: false,
      isDraw: true,
      isLose: false,
    });
  });

  it("calls a lower score a loss even with correct answers", () => {
    expect(resolveMatchOutcome({ userScore: 200, opponentScore: 500, userCorrect: 2 })).toEqual({
      isWin: false,
      isDraw: false,
      isLose: true,
    });
  });

  it("always returns exactly one outcome", () => {
    const scores = [0, 1, 100, 250, 1000];
    for (const userScore of scores) {
      for (const opponentScore of scores) {
        for (const userCorrect of [0, 1, 5]) {
          const { isWin, isDraw, isLose } = resolveMatchOutcome({
            userScore,
            opponentScore,
            userCorrect,
          });
          const set = [isWin, isDraw, isLose].filter(Boolean).length;
          expect(set, `${userScore}/${opponentScore}/${userCorrect}`).toBe(1);
        }
      }
    }
  });

  it("never awards a win to a player with zero correct answers, at any score", () => {
    for (const userScore of [0, 50, 500, 5000]) {
      for (const opponentScore of [0, 50, 500, 5000]) {
        const { isWin } = resolveMatchOutcome({ userScore, opponentScore, userCorrect: 0 });
        expect(isWin, `${userScore} vs ${opponentScore}`).toBe(false);
      }
    }
  });
});
