import { useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { REWARDS } from "@/config/rewardConfig";
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
  /** The same settlement, with the server's reason when it moved nothing on purpose. */
  settleGameDetailed: (outcome: GameOutcome, matchId?: string) => Promise<{ applied: number; reason: string | null }>;
  /**
   * Settle a solo picture game — the Guess card's — at its own stake:
   * REWARDS.GUESS_STAKE in, the same out on a pass, off on a fail.
   * `settle_guess_game` decides the amount; the run's id keeps a second
   * call from moving anything.
   */
  settleGuessGame: (outcome: GameOutcome, runId: string) => Promise<number>;
  winAmount: number;
  drawAmount: number;
  netWinProfit: number;
  netLoss: number;
  /** Always false: a quick game costs the stake for everybody. Kept so the
   *  screens reading it need not all change at once. */
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

  const stakeAmount = REWARDS.GAME_STAKE;
  const winAmount = REWARDS.GAME_WIN_REWARD;    // 500
  const drawAmount = REWARDS.GAME_DRAW_REFUND;  // 0

  // A quick game costs the stake for everybody, PRO included — the same
  // rule a room has always had, where the pot is other players' money
  // (owner: "give me sql to charge pro users too on quick games"). PRO's
  // benefit is unlimited plays, not a discount on every loss.
  const isVipFreePlay = false;

  // Net profit/loss from player's perspective (post-game model)
  const netWinProfit = winAmount;   // +500
  const netLoss = stakeAmount;      // -500 (deducted on loss)

  const hasEnoughCoins = canAffordCoins(stakeAmount);
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
      const { credit, debit } = resolveGameSettlement({ outcome, coins });
      if (credit > 0) return (await addCoins(credit, "stake_win")) ? credit : 0;
      if (debit > 0) return (await spendCoins(debit)) ? -debit : 0;
      return 0;
    },
    [addCoins, spendCoins, coins],
  );

  /**
   * Settle a finished game in one server call.
   *
   * The amount is not sent. `settle_quick_game` decides what a win and a loss
   * are worth, floors the debit at the balance, counts the day's ceiling against the NET of both directions, and records
   * the match id so a second call for the same game moves nothing.
   *
   * What comes back is what actually moved, so the result screen announces
   * the real number rather than an intended ±500 that may never have landed.
   */
  const settleGameDetailed = useCallback(
    async (outcome: GameOutcome, matchId?: string): Promise<{ applied: number; reason: string | null }> => {
      if (!user) return { applied: 0, reason: "no_user" };

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
          if (missing) return { applied: await settleLocally(outcome), reason: "not_deployed" };
          console.error("[useGameStake] settle_quick_game failed:", error);
          return { applied: 0, reason: "error" };
        }

        if (typeof data?.coins === "number") {
          setProfileLocal({ coins: data.coins });
        }
        if (data?.reason === "daily_cap") {
          console.warn("[useGameStake] win not paid: daily settlement ceiling reached");
        }
        return {
          applied: typeof data?.applied === "number" ? data.applied : 0,
          reason: data?.reason ?? null,
        };
      } catch (err) {
        console.error("[useGameStake] settle_quick_game threw:", err);
        return { applied: 0, reason: "error" };
      }
    },
    [user, setProfileLocal, settleLocally],
  );

  /** The number alone, for callers that only draw it. */
  const settleGame = useCallback(
    async (outcome: GameOutcome, matchId?: string): Promise<number> => (await settleGameDetailed(outcome, matchId)).applied,
    [settleGameDetailed],
  );

  const settleGuessGame = useCallback(
    async (outcome: GameOutcome, runId: string): Promise<number> => {
      if (!user) return 0;
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: SettlementResponse | null;
          error: { message: string; code?: string } | null;
        }>;
      };
      try {
        const { data, error } = await client.rpc("settle_guess_game", {
          p_outcome: outcome,
          p_reference: runId,
        });
        if (error) {
          // The migration has not reached this project yet: settle at the
          // card's own stake the old way rather than not at all.
          const missing = error.code === "PGRST202" || /settle_guess_game/i.test(error.message);
          if (!missing) {
            console.error("[useGameStake] settle_guess_game failed:", error);
            return 0;
          }
          if (outcome === "win") return (await addCoins(REWARDS.GUESS_STAKE, "stake_win")) ? REWARDS.GUESS_STAKE : 0;
          if (outcome === "lose") {
            const debit = Math.min(REWARDS.GUESS_STAKE, Math.max(0, Math.floor(coins)));
            return debit > 0 && (await spendCoins(debit)) ? -debit : 0;
          }
          return 0;
        }
        if (typeof data?.coins === "number") setProfileLocal({ coins: data.coins });
        return typeof data?.applied === "number" ? data.applied : 0;
      } catch (err) {
        console.error("[useGameStake] settle_guess_game threw:", err);
        return 0;
      }
    },
    [user, setProfileLocal, addCoins, spendCoins, coins],
  );

  return {
    canPlay,
    hasEnoughCoins,
    stakeAmount,
    settleGame,
    settleGameDetailed,
    settleGuessGame,
    winAmount,
    drawAmount,
    netWinProfit,
    netLoss,
    isVipFreePlay,
  };
}
