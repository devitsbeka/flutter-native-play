import { describe, it, expect } from "vitest";
import { resolveGameSettlement } from "@/utils/gameStake";
import { REWARDS } from "@/config/rewardConfig";

// A quick game pays; it never takes (20261108100000_no_wagering).
describe("quick game settlement", () => {
  it("pays the win reward for a win", () => {
    expect(resolveGameSettlement({ outcome: "win" })).toEqual({ credit: REWARDS.GAME_WIN_REWARD, delta: REWARDS.GAME_WIN_REWARD });
  });

  it("pays the draw reward for a draw", () => {
    expect(resolveGameSettlement({ outcome: "draw" })).toEqual({ credit: REWARDS.GAME_DRAW_REWARD, delta: REWARDS.GAME_DRAW_REWARD });
  });

  it("costs nothing for a loss", () => {
    expect(resolveGameSettlement({ outcome: "lose" })).toEqual({ credit: 0, delta: 0 });
  });

  it("never reports a negative delta", () => {
    for (const outcome of ["win", "draw", "lose"] as const) {
      expect(resolveGameSettlement({ outcome }).delta).toBeGreaterThanOrEqual(0);
    }
  });
});
