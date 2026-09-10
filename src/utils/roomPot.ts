import { REWARDS } from "@/config/rewardConfig";

/**
 * What the lobby tells a player a round is worth.
 *
 * Every seat stakes REWARDS.GAME_STAKE and the table is the pot. The split
 * is the server's (settle_room_round: winner takes all at two players,
 * 70 / 20 / 10 at three or more, the rounding to first) — the client never
 * pays any of it. But the lobby, the preview sheet and the rematch sheet
 * all said "Winner takes: <whole pot>" under a three-player table, and
 * first place then took 70% of it. The number a player is promised before
 * Start has to be the number that lands, so the three sites read it from
 * here, and the tests in roomPot.test.ts check this file agrees with the
 * migration.
 */

/** Everything staked into a round of `players` seats, or null below two. */
export function roundPot(players: number, stake: number = REWARDS.GAME_STAKE): number | null {
  return players >= 2 ? players * stake : null;
}

/**
 * What FIRST place takes out of a round of `players` seats: the whole pot at
 * two, 70% plus the rounding remainder at three or more (the server gives
 * the coins integer division drops to first, so the pot balances). Null
 * below two players, where the round is practice and nothing is staked.
 */
export function firstPlaceShare(players: number, stake: number = REWARDS.GAME_STAKE): number | null {
  const pot = roundPot(players, stake);
  if (pot === null) return null;
  if (players === 2) return pot;
  const first = Math.floor((pot * 70) / 100);
  const second = Math.floor((pot * 20) / 100);
  const third = Math.floor((pot * 10) / 100);
  return first + (pot - first - second - third);
}
