/**
 * Trivia King, as an opponent.
 *
 * A picture game from the Guess card is played against the app's own
 * mascot: 200 in, and whoever scores more takes the pot (owner: "we should
 * handle like one game vs trivia king (our app) and player pays 200 coins
 * and if wins against our mascot named Trivia King ... we should give user
 * +200, if not - loses 200 coins"). The King has to answer, then, and this
 * is how it does: each question, correctly with a fixed chance, decided by
 * a hash of the run and the question so a re-render — or a second device
 * reading the same run — sees the same answer, not a fresh roll.
 *
 * Deliberately not stronger than a decent player. The point of the King is
 * a stake with a face on it, not a house edge: at 60% the King scores six of
 * ten on average, which a player who knows the pictures beats and one who is
 * guessing does not.
 *
 * Client-side, like the rest of a solo game's scoring: the settlement only
 * ever takes win / lose / draw from the client and decides the amount
 * itself (settle_guess_game), which is the same trust the quick game runs on.
 */

/** How often the King gets a question right. */
export const MASCOT_ACCURACY = 0.6;

/**
 * A small string hash to [0, 1). FNV-1a, then MurmurHash3's finaliser,
 * then folded to a unit float.
 *
 * The finaliser is not decoration. FNV-1a alone lets the last byte reach
 * only the low bits, and the question index IS the seed's last byte — so
 * question 3 of a run was the same call as question 3 of most other runs,
 * and two hundred games shared eighteen answer sheets. The mix spreads
 * every input bit over the whole word first.
 */
function unit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 8) / 0x01000000;
}

/** Whether the King answers question `index` of run `runId` correctly. */
export function mascotAnswers(runId: string, index: number, accuracy: number = MASCOT_ACCURACY): boolean {
  return unit(`${runId}:${index}`) < accuracy;
}

export type DuelOutcome = "win" | "draw" | "lose";

/** The player's result against the King, by score. A tie is a draw: nothing moves. */
export function duelOutcome(player: number, mascot: number): DuelOutcome {
  if (player > mascot) return "win";
  if (player < mascot) return "lose";
  return "draw";
}
