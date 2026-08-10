/**
 * Coin payout and win-crediting for a multiplayer room result.
 *
 * A room with a single player is practice: XP still counts, but there is no
 * opponent to beat, so no coin bonus, no recorded win and no streak —
 * otherwise a solo "room" is a free coin and win farm.
 *
 * Placement coins scale with how many opponents were actually beaten, so
 * winning an 8-player room pays more than winning a duel.
 */

import { REWARDS } from "@/config/rewardConfig";

export interface MultiplayerPayoutInput {
  /** Total participants in the room, including this player. */
  playerCount: number;
  /** This player's finishing position, 1-based. */
  myRank: number;
  /** This player's raw score for the game. */
  myScore: number;
  /** Whether the room considers this player the winner. */
  isWin: boolean;
}

export interface MultiplayerPayout {
  earnedCoins: number;
  isPractice: boolean;
  /** True only when the win should touch games_won and the streak. */
  countsAsWin: boolean;
}

export function calculateMultiplayerPayout({
  playerCount,
  myRank,
  myScore,
  isWin,
}: MultiplayerPayoutInput): MultiplayerPayout {
  const isPractice = playerCount <= 1;
  const countsAsWin = isWin && !isPractice;

  let earnedCoins = 0;
  if (!isPractice) {
    const playersBeaten = Math.max(0, playerCount - myRank);
    if (myRank === 1) {
      earnedCoins =
        Math.min(
          REWARDS.MULTIPLAYER_WIN_COINS_PER_BEATEN * playersBeaten,
          REWARDS.MULTIPLAYER_1ST_COINS
        ) + myScore;
    } else if (myRank === 2 || myRank === 3) {
      earnedCoins = Math.floor(myScore / 2);
    } else {
      earnedCoins = REWARDS.MULTIPLAYER_PARTICIPATION_COINS;
    }
  }

  return { earnedCoins, isPractice, countsAsWin };
}

/**
 * The streak value after a room game. A practice game leaves the streak
 * untouched; any non-practice game that is not a win resets it.
 */
export function nextStreak(currentStreak: number, countsAsWin: boolean, isPractice: boolean): number {
  if (countsAsWin) return currentStreak + 1;
  if (isPractice) return currentStreak;
  return 0;
}
