/**
 * What a finished quick game costs or pays.
 *
 * Win +500, lose -500, draw nothing — but the loss has an edge the rule as
 * stated does not cover, and it is the one that was going wrong: the currency
 * RPC refuses any debit that would take a balance below zero. Asking it for
 * the full 500 against 300 coins therefore took NOTHING, and the result
 * screen still announced -500. The player was told they had paid and had not.
 *
 * So a loss takes the stake or the balance, whichever is smaller, and says
 * which. A player should never reach that state — every way into a game
 * checks the stake is covered first — but "should never" is what the old code
 * assumed, and a balance can still move between starting a game and finishing
 * one, so the last step in the chain reports what it did rather than what it
 * meant to do.
 */

import { REWARDS } from "@/config/rewardConfig";

export type GameOutcome = "win" | "draw" | "lose";

export interface GameSettlementInput {
  outcome: GameOutcome;
  /** The player's balance as the game ends. */
  coins: number;
  /** PRO players do not pay the stake. They still earn the win. */
  isVip: boolean;
}

export interface GameSettlement {
  /** Coins to credit. Zero unless the game was won. */
  credit: number;
  /** Coins to debit. Never more than the player has. */
  debit: number;
  /** What the balance should move by, for the result screen to show. */
  delta: number;
}

export function resolveGameSettlement({
  outcome,
  coins,
  isVip,
}: GameSettlementInput): GameSettlement {
  if (outcome === "win") {
    const credit = REWARDS.GAME_WIN_REWARD;
    return { credit, debit: 0, delta: credit };
  }

  if (outcome === "draw") {
    return { credit: 0, debit: 0, delta: 0 };
  }

  if (isVip) {
    return { credit: 0, debit: 0, delta: 0 };
  }

  const debit = Math.min(REWARDS.GAME_STAKE, Math.max(0, Math.floor(coins)));
  // `-0` where nothing moved: harmless arithmetic, but it reaches a badge as
  // the string "-0".
  return { credit: 0, debit, delta: debit === 0 ? 0 : -debit };
}
