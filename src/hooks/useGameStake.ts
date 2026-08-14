import { useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import { REWARDS } from "@/config/rewardConfig";
import { shouldSkipStake } from "@/utils/vipMultipliers";
import { resolveGameSettlement, type GameOutcome } from "@/utils/gameStake";

export interface GameStakeResult {
  canPlay: boolean;
  hasEnoughCoins: boolean;
  stakeAmount: number;
  /**
   * Settle a finished game: +500 for a win, -500 for a loss, 0 for a draw.
   * Returns what actually moved, signed.
   */
  settleGame: (outcome: GameOutcome, matchId?: string) => Promise<number>;
  winAmount: number;
  drawAmount: number;
  netWinProfit: number;
  netLoss: number;
  isVipFreePlay: boolean;
}

/** What the server sends back from `settle_quick_game`. */
interface SettlementResponse {
  applied?: number;
  coins?: number;
  reason?: string;
}

export function useGameStake(): GameStakeResult {
  const { coins, spendCoins, addCoins, canAffordCoins } = useCurrency();
  const { user, setProfileLocal } = useAuth();
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
   * The path this used to take, kept for databases that have not had
   * `settle_quick_game` applied yet. It credits a win through the ordinary
   * gameplay-reward ceiling, which counts credits and ignores the matching
   * debits — the asymmetry the migration exists to fix. Better than a game
   * that settles nothing at all, which is what a missing function would
   * otherwise mean.
   */
  const settleLocally = useCallback(
    async (outcome: GameOutcome): Promise<number> => {
      const { credit, debit } = resolveGameSettlement({ outcome, coins, isVip });
      if (credit > 0) return (await addCoins(credit, "stake_win")) ? credit : 0;
      if (debit > 0) return (await spendCoins(debit)) ? -debit : 0;
      return 0;
    },
    [addCoins, spendCoins, coins, isVip],
  );

  /**
   * Settle a finished game in one server call.
   *
   * The amount is not sent. `settle_quick_game` decides what a win and a loss
   * are worth, floors the debit at the balance, exempts PRO from the loss,
   * counts the day's ceiling against the NET of both directions, and records
   * the match id so a second call for the same game moves nothing.
   *
   * What comes back is what actually moved, so the result screen announces
   * the real number rather than an intended ±500 that may never have landed.
   */
  const settleGame = useCallback(
    async (outcome: GameOutcome, matchId?: string): Promise<number> => {
      if (!user) return 0;

      // Cast rather than regenerate the whole database type file — see the
      // note in AGENTS.md about what regenerating it deletes.
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: SettlementResponse | null;
          error: { message: string; code?: string } | null;
        }>;
      };

      try {
        const { data, error } = await client.rpc("settle_quick_game", {
          p_outcome: outcome,
          p_reference: matchId || null,
        });

        if (error) {
          // PGRST202: the function is not in the schema cache, i.e. the
          // migration has not been applied to this project yet.
          const missing = error.code === "PGRST202" || /settle_quick_game/i.test(error.message);
          if (missing) return settleLocally(outcome);
          console.error("[useGameStake] settle_quick_game failed:", error);
          return 0;
        }

        if (typeof data?.coins === "number") {
          setProfileLocal({ coins: data.coins });
        }
        if (data?.reason === "daily_cap") {
          console.warn("[useGameStake] win not paid: daily settlement ceiling reached");
        }
        return typeof data?.applied === "number" ? data.applied : 0;
      } catch (err) {
        console.error("[useGameStake] settle_quick_game threw:", err);
        return 0;
      }
    },
    [user, setProfileLocal, settleLocally],
  );

  return {
    canPlay,
    hasEnoughCoins,
    stakeAmount,
    settleGame,
    winAmount,
    drawAmount,
    netWinProfit,
    netLoss,
    isVipFreePlay,
  };
}
