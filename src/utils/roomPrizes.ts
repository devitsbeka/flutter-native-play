import { REWARDS } from "@/config/rewardConfig";

/**
 * What a room round pays, by place.
 *
 * Nobody pays in. The house pays first, second and third
 * (REWARDS.ROOM_PLACE_PRIZES, settled by settle_room_round in
 * 20261108100000_no_wagering.sql); at two players only first is paid, and a
 * table of one is practice. Tied seats share their places' prizes — that
 * split is the server's, this is what the lobby, the preview sheet and the
 * rematch sheet promise before Start.
 */

/** The prizes for places 1..n at a table of `players` seats, or null below two. */
export function placePrizes(players: number): readonly number[] | null {
  if (players < 2) return null;
  return players === 2 ? REWARDS.ROOM_PLACE_PRIZES.slice(0, 1) : REWARDS.ROOM_PLACE_PRIZES;
}

/** What first place earns at a table of `players` seats, or null below two. */
export function firstPlacePrize(players: number): number | null {
  return placePrizes(players)?.[0] ?? null;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * The prizes as one line: "1st 200 · 2nd 100 · 3rd 50", or "1st 200" at two
 * players. `players` defaults to a full table, which is what a room is made
 * for — the sheets that describe a room before anyone sits down use that.
 */
export function prizeLadderText(t: Translate, players: number = 3): string {
  const prizes = placePrizes(Math.max(2, players)) ?? REWARDS.ROOM_PLACE_PRIZES;
  const [first = 0, second = 0, third = 0] = prizes.map((n) => n.toLocaleString());
  return prizes.length >= 3
    ? t("playRewards.prizeLadder", { first, second, third })
    : t("playRewards.prizeWinnerOnly", { first });
}

/** The same ladder a place to a line — "1st 200", "2nd 100", "3rd 50" — for a tile too narrow for one. */
export function prizeLadderLines(t: Translate, players: number = 3): string[] {
  return prizeLadderText(t, players).split(" · ");
}
