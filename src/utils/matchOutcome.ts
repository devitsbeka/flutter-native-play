/**
 * Who won a head-to-head match.
 *
 * A win must be earned: leading on score AND getting at least one question
 * right. A player who answers nothing correctly but still leads (because the
 * opponent went negative on time, or simply answered even less) does not get
 * a victory screen, a win streak, or win coins — that reads as a bug to the
 * player and inflates the win column for free.
 */

export interface MatchOutcomeInput {
  userScore: number;
  opponentScore: number;
  /** Number of questions the user actually answered correctly. */
  userCorrect: number;
}

export interface MatchOutcome {
  isWin: boolean;
  isDraw: boolean;
  isLose: boolean;
}

export function resolveMatchOutcome({
  userScore,
  opponentScore,
  userCorrect,
}: MatchOutcomeInput): MatchOutcome {
  const scoreLead = userScore > opponentScore;
  const isWin = scoreLead && userCorrect > 0;
  // Leading with zero correct answers is demoted to a draw rather than a
  // loss: the player did not lose, they just did not earn the win.
  const isDraw = userScore === opponentScore || (scoreLead && userCorrect === 0);
  const isLose = !isWin && !isDraw;

  return { isWin, isDraw, isLose };
}
