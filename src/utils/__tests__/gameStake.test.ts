import { describe, it, expect } from "vitest";
import { resolveGameSettlement } from "@/utils/gameStake";
import { REWARDS } from "@/config/rewardConfig";

describe("quick game settlement", () => {
  it("pays 500 for a win", () => {
    expect(resolveGameSettlement({ outcome: "win", coins: 1000, isVip: false }))
      .toEqual({ credit: 500, debit: 0, delta: 500 });
  });

  it("takes 500 for a loss", () => {
    expect(resolveGameSettlement({ outcome: "lose", coins: 1000, isVip: false }))
      .toEqual({ credit: 0, debit: 500, delta: -500 });
  });

  it("moves nothing on a draw", () => {
    expect(resolveGameSettlement({ outcome: "draw", coins: 1000, isVip: false }))
      .toEqual({ credit: 0, debit: 0, delta: 0 });
  });

  it("takes what is there when the balance is short of the stake", () => {
    // The bug this function exists for: the currency RPC refuses a debit that
    // would go below zero, so asking for 500 against 300 took nothing at all
    // while the screen still said -500.
    expect(resolveGameSettlement({ outcome: "lose", coins: 300, isVip: false }))
      .toEqual({ credit: 0, debit: 300, delta: -300 });
  });

  it("takes nothing from an empty balance, and says so", () => {
    expect(resolveGameSettlement({ outcome: "lose", coins: 0, isVip: false }))
      .toEqual({ credit: 0, debit: 0, delta: 0 });
  });

  it("never reports a debit the balance cannot cover", () => {
    for (const coins of [0, 1, 250, 499, 500, 501, 5000]) {
      const { debit, delta } = resolveGameSettlement({ outcome: "lose", coins, isVip: false });
      expect(debit).toBeLessThanOrEqual(coins);
      expect(debit).toBeLessThanOrEqual(REWARDS.GAME_STAKE);
      // `0`, not `-0`: the badge renders this number.
      expect(delta).toBe(debit === 0 ? 0 : -debit);
    }
  });

  it("treats a negative balance as nothing to take rather than a credit", () => {
    // Nothing should ever write one, but a debit computed from it would be a
    // negative debit — which is a credit the player did not earn.
    expect(resolveGameSettlement({ outcome: "lose", coins: -100, isVip: false }))
      .toEqual({ credit: 0, debit: 0, delta: 0 });
  });

  it("spares PRO players the stake but still pays them for a win", () => {
    expect(resolveGameSettlement({ outcome: "lose", coins: 1000, isVip: true }))
      .toEqual({ credit: 0, debit: 0, delta: 0 });
    expect(resolveGameSettlement({ outcome: "win", coins: 1000, isVip: true }))
      .toEqual({ credit: 500, debit: 0, delta: 500 });
  });

  it("settles a win and a loss to zero over a pair", () => {
    // The economy's headline promise: win one, lose one, end where you began.
    const won = resolveGameSettlement({ outcome: "win", coins: 1000, isVip: false });
    const lost = resolveGameSettlement({ outcome: "lose", coins: 1000 + won.delta, isVip: false });
    expect(won.delta + lost.delta).toBe(0);
  });
});
