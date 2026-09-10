/**
 * Trivia King, as an opponent.
 *
 * A picture game from the Guess card is played against the app's own
 * mascot: 200 in, and whoever scores more takes the pot (owner: "we should
 * handle like one game vs trivia king (our app) and player pays 200 coins
 * and if wins against our mascot named Trivia King ... we should give user
 * +200, if not - loses 200 coins").
 *
 * How the two of them score (owner: "if user answers correctly in 5 seconds
 * point is theirs but if they answer correctly after 5 seconds point gets
 * trivia king ... if user answers in 5 seconds give 100 points, if answers
 * after 5 seconds it can be 80 etc.. Trivia king knows all the answers,
 * never gets 1000 points but it is hard to beat Trivia King but if user
 * knows all answers and answers in 5 seconds user should win"):
 *
 *  - The King knows every answer and scores KING_POINTS on every question,
 *    the same every time: 900 over ten, never 1000.
 *  - The player scores by the clock. A right answer within FAST_ANSWER_SECONDS
 *    is worth QUESTION_POINTS — more than the King's, so that question is
 *    theirs. A right answer after that starts at SLOW_ANSWER_START and loses
 *    SLOW_ANSWER_STEP a second down to SLOW_ANSWER_FLOOR — less than the
 *    King's, so that question is his. A wrong answer, or none, is nothing.
 *
 * So ten right answers inside five seconds is 1000 against 900 and the pot;
 * nine of them and a miss is 900 against 900, a draw; one slow answer among
 * nine fast ones still wins (980); and anyone who guesses loses. Hard to
 * beat, beatable by exactly the player the owner described.
 *
 * Client-side, like the rest of a solo game's scoring: the settlement only
 * ever takes win / lose / draw from the client and decides the amount
 * itself (settle_guess_game), which is the same trust the quick game runs on.
 */

/** A question's clock, in seconds. The level page counts down from this. */
export const QUESTION_SECONDS = 15;
/** Answer right inside this and the question is the player's. */
export const FAST_ANSWER_SECONDS = 5;
/** What a fast right answer is worth. */
export const QUESTION_POINTS = 100;
/** What a right answer in the sixth second is worth, and how it falls from there. */
export const SLOW_ANSWER_START = 80;
export const SLOW_ANSWER_STEP = 10;
export const SLOW_ANSWER_FLOOR = 40;
/** What the King scores on every question. Under QUESTION_POINTS: a fast answer beats him. */
export const KING_POINTS = 90;

/**
 * The player's points for one question: nothing for a wrong answer, the
 * full QUESTION_POINTS inside the fast window, and a falling amount after
 * it. `elapsedSeconds` is whole seconds the clock has ticked since the
 * question's picture was on screen — the same clock the player watches.
 */
export function answerPoints(correct: boolean, elapsedSeconds: number): number {
  if (!correct) return 0;
  const elapsed = Math.max(0, Math.ceil(elapsedSeconds));
  if (elapsed <= FAST_ANSWER_SECONDS) return QUESTION_POINTS;
  const late = elapsed - FAST_ANSWER_SECONDS - 1;
  return Math.max(SLOW_ANSWER_FLOOR, SLOW_ANSWER_START - SLOW_ANSWER_STEP * late);
}

export type DuelOutcome = "win" | "draw" | "lose";

/** The player's result against the King, by points. A tie is a draw: nothing moves. */
export function duelOutcome(player: number, mascot: number): DuelOutcome {
  if (player > mascot) return "win";
  if (player < mascot) return "lose";
  return "draw";
}
