/**
 * What a finished quick game pays.
 *
 * Win +200, draw +50, lose nothing — for everybody. Nothing is staked to
 * play and nothing is taken for a loss: MyTrivia is a trivia game, and a
 * game you pay into and can lose coins from is a wager, which App Review
 * rejected 1.0 (74) for. The server decides the real amounts in
 * `settle_quick_game` (20261108100000_no_wagering.sql); this is what the
 * result screen expects to see and what the fallback credits when the
 * function has not reached a project yet.
 *
 * The file keeps its old name so the imports across the app need not move.
 */

import { REWARDS } from "@/config/rewardConfig";

export type GameOutcome = "win" | "draw" | "lose";

export interface GameSettlementInput {
  outcome: GameOutcome;
}

export interface GameSettlement {
  /** Coins to credit. Never negative. */
  credit: number;
  /** What the balance should move by, for the result screen to show. */
  delta: number;
}

export function resolveGameSettlement({ outcome }: GameSettlementInput): GameSettlement {
  const credit =
    outcome === "win" ? REWARDS.GAME_WIN_REWARD
    : outcome === "draw" ? REWARDS.GAME_DRAW_REWARD
    : 0;
  return { credit, delta: credit };
}
