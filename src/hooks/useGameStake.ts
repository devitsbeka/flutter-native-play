import { useState, useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { REWARDS } from "@/config/rewardConfig";

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
}

export function useGameStake(): GameStakeResult {
  const { coins, spendCoins, addCoins, canAffordCoins } = useCurrency();
  const [stakePaid, setStakePaid] = useState(false);

  const stakeAmount = REWARDS.GAME_STAKE;
  const winAmount = REWARDS.GAME_WIN_REWARD;
  const drawAmount = REWARDS.GAME_DRAW_REFUND;
  
  // Net profit/loss from player's perspective
  const netWinProfit = winAmount - stakeAmount; // +500
  const netLoss = stakeAmount; // -500 (already paid)

  const hasEnoughCoins = canAffordCoins(stakeAmount);
  const canPlay = hasEnoughCoins;

  const deductStake = useCallback(async (): Promise<boolean> => {
    if (!hasEnoughCoins) return false;
    
    const success = await spendCoins(stakeAmount);
    if (success) {
      setStakePaid(true);
    }
    return success;
  }, [hasEnoughCoins, spendCoins, stakeAmount]);

  const awardWin = useCallback(async (): Promise<boolean> => {
    // Winner gets both stakes (1000 coins)
    const success = await addCoins(winAmount);
    setStakePaid(false);
    return success;
  }, [addCoins, winAmount]);

  const awardDraw = useCallback(async (): Promise<boolean> => {
    // Draw: get half stake back
    const success = await addCoins(drawAmount);
    setStakePaid(false);
    return success;
  }, [addCoins, drawAmount]);

  const awardLose = useCallback(() => {
    // Loser gets nothing - stake already deducted
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
  };
}
