/**
 * What a game mode costs and how many people it seats.
 *
 * Both numbers are printed on the mode's card — the coin price top left, the
 * head count top right — on the play chooser and, for the count, on the home
 * rail. They live here because those two surfaces drew the same cards from
 * two hand-written lists, and the lists had already drifted: the chooser
 * dropped the count entirely while the home rail kept it.
 *
 * Every mode is free to play: nothing is staked to enter and a loss costs
 * nothing (20261108100000_no_wagering.sql — App Review rejects a game you pay
 * coins into and can lose them from as simulated gambling). `0` means free
 * and SAYS so: the badge reads "Free" (owner, first for Words: "say free
 * instead coins"). `null` means free and silent — no badge at all: My
 * Trivias is yours, and playing your own questions has never cost anything,
 * so there is nothing to announce (owner: "it's free but we don't have to
 * show it at all"). The field stays a number so a mode could carry a price
 * again without the cards changing shape; none should.
 */

import type { GameChoice } from "@/components/team/CreateRoomPage";

export interface GameModeMeta {
  /** How many can play, exactly as the chip prints it: "1", "2-10". */
  players: string;
  /**
   * What one game costs in coins; 0 for a free mode whose badge says "Free";
   * null for a free mode that draws no badge at all.
   */
  price: number | null;
}

export const GAME_MODE_META: Record<GameChoice, GameModeMeta> = {
  // Played alone, against the clock.
  quick: { players: "1", price: 0 },
  // Classic trivia around a table — the room caps at ten.
  library: { players: "2-10", price: 0 },
  // One picture game, one player, against Trivia King.
  guess: { players: "1", price: 0 },
  king: { players: "1-10", price: 0 },
  // Two teams, smallest arena is 2v2.
  battle: { players: "4-10", price: 0 },
  // Free, and the card says so.
  words: { players: "1-2", price: 0 },
  // Your own trivias, free either way — solo or around a table.
  mytrivias: { players: "1-10", price: null },
};
