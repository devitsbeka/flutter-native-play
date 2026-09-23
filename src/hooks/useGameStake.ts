import { useCallback } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { REWARDS } from "@/config/rewardConfig";
import { resolveGameSettlement, type GameOutcome } from "@/utils/gameStake";

/**
 * Paying out a finished solo game.
 *
 * Nothing is staked. A game is free to start whatever the balance, a win or
 * a draw is paid by the house and a loss costs nothing — see
 * 20261108100000_no_wagering.sql. The name is historical; the hook only ever
 * credits.
 */
export interface GameStakeResult {
  /**
   * Settle a finished quick game: +200 for a win, +50 for a draw, nothing for
   * a loss. Returns what actually landed, never negative.
   */
  settleGame: (outcome: GameOutcome, matchId?: string) => Promise<number>;
  /** The same settlement, with the server's reason when it paid nothing on purpose. */
  settleGameDetailed: (outcome: GameOutcome, matchId?: string) => Promise<{ applied: number; reason: string | null }>;
  /**
   * Settle a Guess card run: REWARDS.GUESS_WIN_REWARD for beating Trivia
   * King, nothing otherwise. `settle_guess_game` decides the amount; the
   * run's id keeps a second call from paying twice.
   */
  settleGuessGame: (outcome: GameOutcome, runId: string) => Promise<number>;
  winAmount: number;
  drawAmount: number;
}

/** What the server sends back from `settle_quick_game`. */
interface SettlementResponse {
  applied?: number;
  coins?: number;
  reason?: string;
}

export function useGameStake(): GameStakeResult {
  const { addCoins } = useCurrency();
  const { user, setProfileLocal } = useAuth();

  const winAmount = REWARDS.GAME_WIN_REWARD;
  const drawAmount = REWARDS.GAME_DRAW_REWARD;

  /**
   * The path for a database that has not had `settle_quick_game` applied
   * yet: credit the reward through the ordinary gameplay-reward ceiling. It
   * only ever credits — there is no loss to take.
   */
  const settleLocally = useCallback(
    async (outcome: GameOutcome): Promise<number> => {
      const { credit } = resolveGameSettlement({ outcome });
      if (credit <= 0) return 0;
      return (await addCoins(credit, "stake_win")) ? credit : 0;
    },
    [addCoins],
  );

  /**
   * Settle a finished game in one server call.
   *
   * The amount is not sent. `settle_quick_game` decides what a win and a
   * draw are worth, pays nothing for a loss, keeps the day's rewards under
   * a ceiling, and records the match id so a second call pays nothing.
   *
   * What comes back is what actually landed, so the result screen announces
   * the real number rather than an intended reward that may never have paid.
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
          console.warn("[useGameStake] reward not paid: daily ceiling reached");
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
          // The migration has not reached this project yet: pay a pass the
          // old way rather than not at all. A fail pays nothing either way.
          const missing = error.code === "PGRST202" || /settle_guess_game/i.test(error.message);
          if (!missing) {
            console.error("[useGameStake] settle_guess_game failed:", error);
            return 0;
          }
          if (outcome === "win") {
            return (await addCoins(REWARDS.GUESS_WIN_REWARD, "stake_win")) ? REWARDS.GUESS_WIN_REWARD : 0;
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
    [user, setProfileLocal, addCoins],
  );

  return {
    settleGame,
    settleGameDetailed,
    settleGuessGame,
    winAmount,
    drawAmount,
  };
}
