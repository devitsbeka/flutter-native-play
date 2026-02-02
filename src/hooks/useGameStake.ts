import { useState, useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useVipStatus } from "@/hooks/useVipStatus";
import { REWARDS } from "@/config/rewardConfig";
import { shouldSkipStake } from "@/utils/vipMultipliers";

export interface GameStakeResult {
  canPlay: boolean;
  hasEnoughCoins: boolean;
  stakeAmount: number;
  deductStake: () => Promise<boolean>;
  awardWin: () => Promise<boolean>;
  awardDraw: () => Promise<boolean>;
  awardLose: () => void;
  winAmount: number;
  drawAmount: number;
  netWinProfit: number;
  netLoss: number;
  isVipFreePlay: boolean;
}

export function useGameStake(): GameStakeResult {
  const { coins, spendCoins, addCoins, canAffordCoins } = useCurrency();
  const { isVip } = useVipStatus();
  const [stakePaid, setStakePaid] = useState(false);

  const stakeAmount = REWARDS.GAME_STAKE;
  const winAmount = REWARDS.GAME_WIN_REWARD;
  const drawAmount = REWARDS.GAME_DRAW_REFUND;
  
  // VIP users skip stake entirely
  const isVipFreePlay = shouldSkipStake(isVip);
  
  // Net profit/loss from player's perspective
  const netWinProfit = isVipFreePlay ? winAmount : winAmount - stakeAmount; // VIP: +1000, Normal: +500
  const netLoss = isVipFreePlay ? 0 : stakeAmount; // VIP: 0, Normal: -500 (already paid)

  const hasEnoughCoins = isVipFreePlay || canAffordCoins(stakeAmount);
  const canPlay = hasEnoughCoins;

  const deductStake = useCallback(async (): Promise<boolean> => {
    // VIP users don't pay stake
    if (isVipFreePlay) {
      setStakePaid(true);
      return true;
    }
    
    if (!hasEnoughCoins) return false;
    
    const success = await spendCoins(stakeAmount);
    if (success) {
      setStakePaid(true);
    }
    return success;
  }, [isVipFreePlay, hasEnoughCoins, spendCoins, stakeAmount]);

  const awardWin = useCallback(async (): Promise<boolean> => {
    // Winner gets both stakes (1000 coins) - VIP also gets full reward
    const success = await addCoins(winAmount);
    setStakePaid(false);
    return success;
  }, [addCoins, winAmount]);

  const awardDraw = useCallback(async (): Promise<boolean> => {
    // Draw: VIP gets full stake back (since they didn't pay), normal users get half
    const refundAmount = isVipFreePlay ? 0 : drawAmount;
    if (refundAmount === 0) {
      setStakePaid(false);
      return true;
    }
    const success = await addCoins(refundAmount);
    setStakePaid(false);
    return success;
  }, [addCoins, drawAmount, isVipFreePlay]);

  const awardLose = useCallback(() => {
    // Loser gets nothing - stake already deducted (or nothing for VIP)
    setStakePaid(false);
  }, []);

  return {
    canPlay,
    hasEnoughCoins,
    stakeAmount,
    deductStake,
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
