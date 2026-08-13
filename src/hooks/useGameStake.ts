import { useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { REWARDS } from "@/config/rewardConfig";
import { shouldSkipStake } from "@/utils/vipMultipliers";

export interface GameStakeResult {
  canPlay: boolean;
  hasEnoughCoins: boolean;
  stakeAmount: number;
  awardWin: () => Promise<boolean>;
  awardDraw: () => Promise<boolean>;
  awardLose: () => Promise<boolean>;
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

  const awardWin = useCallback(async (): Promise<boolean> => {
    // Winner gets +500 coins
    const success = await addCoins(winAmount, "stake_win");
    return success;
  }, [addCoins, winAmount]);

  const awardDraw = useCallback(async (): Promise<boolean> => {
    // Draw: no coin change
    return true;
  }, []);

  const awardLose = useCallback(async (): Promise<boolean> => {
    // VIP users don't lose coins
    if (isVipFreePlay) return true;
    // Non-VIP: deduct 500 coins on loss
    const success = await spendCoins(stakeAmount);
    return success;
  }, [isVipFreePlay, spendCoins, stakeAmount]);

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
