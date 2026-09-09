/**
 * What a game mode costs and how many people it seats.
 *
 * Both numbers are printed on the mode's card — the coin price top left, the
 * head count top right — on the play chooser and, for the count, on the home
 * rail. They live here because those two surfaces drew the same cards from
 * two hand-written lists, and the lists had already drifted: the chooser
 * dropped the count entirely while the home rail kept it.
 *
 * The price is the stake the economy already charges per game
 * ({@link REWARDS.GAME_STAKE}), named per mode so a mode can be priced apart
 * from the rest without hunting through JSX. `null` means the mode is free
 * and draws no price badge at all — My Trivias is yours, and playing your own
 * questions has never cost anything.
 */

import { REWARDS } from "@/config/rewardConfig";
import type { GameChoice } from "@/components/team/CreateRoomPage";

export interface GameModeMeta {
  /** How many can play, exactly as the chip prints it: "1", "2-10". */
  players: string;
  /** What one game costs in coins, or null for a mode that charges nothing. */
  price: number | null;
}

export const GAME_MODE_META: Record<GameChoice, GameModeMeta> = {
  // Played alone, against the clock.
  quick: { players: "1", price: REWARDS.GAME_STAKE },
  // Classic trivia around a table — the room caps at ten.
  library: { players: "2-10", price: REWARDS.GAME_STAKE },
  // One picture game, one player (owner).
  guess: { players: "1", price: REWARDS.GAME_STAKE },
  king: { players: "1-10", price: REWARDS.GAME_STAKE },
  // Two teams, smallest arena is 2v2.
  battle: { players: "4-10", price: REWARDS.GAME_STAKE },
  words: { players: "1-2", price: REWARDS.GAME_STAKE },
  // Your own trivias, free either way — solo or around a table.
  mytrivias: { players: "1-10", price: null },
};
