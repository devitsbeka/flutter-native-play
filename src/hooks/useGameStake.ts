import { useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { REWARDS } from "@/config/rewardConfig";
import { shouldSkipStake } from "@/utils/vipMultipliers";
import { resolveGameSettlement } from "@/utils/gameStake";

export interface GameStakeResult {
  canPlay: boolean;
  hasEnoughCoins: boolean;
  stakeAmount: number;
  /** Coins actually credited for a win: +500, or 0 if the server refused. */
  awardWin: () => Promise<number>;
  awardDraw: () => Promise<number>;
  /** Coins actually taken for a loss, negative: -500, less, or 0. */
  awardLose: () => Promise<number>;
  winAmount: number;
  drawAmount: number;
  netWinProfit: number;
  netLoss: number;
  isVipFreePlay: boolean;
}

export function useGameStake(): GameStakeResult {
  const { coins, spendCoins, addCoins, canAffordCoins } = useCurrency();
  const { isVip } = useVipStatus();

  const stakeAmount = REWARDS.GAME_STAKE;
  const winAmount = REWARDS.GAME_WIN_REWARD;    // 500
  const drawAmount = REWARDS.GAME_DRAW_REFUND;  // 0
  
  // VIP users skip loss deduction entirely
  const isVipFreePlay = shouldSkipStake(isVip);
  
  // Net profit/loss from player's perspective (post-game model)
  const netWinProfit = winAmount;   // +500
  const netLoss = stakeAmount;      // -500 (deducted on loss)

  const hasEnoughCoins = isVipFreePlay || canAffordCoins(stakeAmount);
  const canPlay = hasEnoughCoins;

  /**
   * Settle a finished game. Each one returns the number of coins that
   * actually moved — signed, so the result screen can show what happened
   * rather than what was intended.
   *
   * They used to return a boolean nobody read, and the screen announced ±500
   * either way. A credit the server capped, or a debit it refused for want of
   * balance, both showed as a full ±500 that never reached the profile.
   */
  const awardWin = useCallback(async (): Promise<number> => {
    const { credit } = resolveGameSettlement({ outcome: "win", coins, isVip });
    const success = await addCoins(credit, "stake_win");
    return success ? credit : 0;
  }, [addCoins, coins, isVip]);

  const awardDraw = useCallback(async (): Promise<number> => {
    // Draw: no coin change
    return 0;
  }, []);

  const awardLose = useCallback(async (): Promise<number> => {
    const { debit } = resolveGameSettlement({ outcome: "lose", coins, isVip });
    if (debit <= 0) return 0;
    const success = await spendCoins(debit);
    return success ? -debit : 0;
  }, [spendCoins, coins, isVip]);

  return {
    canPlay,
    hasEnoughCoins,
    stakeAmount,
    awardWin,
    awardDraw,
    awardLose,
    winAmount,
    drawAmount,
    netWinProfit,
    netLoss,
    isVipFreePlay,
  };
}
