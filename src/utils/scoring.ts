/**
 * Unified answer-scoring policy.
 *
 * Every live-answered question in every mode — multiplayer rooms, solo vs
 * bot, TV mode, async challenges — pays from this one formula so the same
 * answer is always worth the same points:
 *
 *   points = 100 + secondsRemaining × 10   (15-second clock, max 250)
 *
 * Wrong answers are always 0. Only the category/level quiz stays outside
 * this scale: it has no per-question clock and awards end-of-level points.
 */

export const BASE_POINTS = 100;
export const TIME_BONUS_MULTIPLIER = 10;
export const QUESTION_TIME_SECONDS = 15;

export const calculatePoints = (isCorrect: boolean, timeRemaining: number): number => {
  if (!isCorrect) return 0;

  const clampedTime = Math.max(0, Math.min(timeRemaining, QUESTION_TIME_SECONDS));

  // Math.round to prevent floating point precision issues from timer decrements
  return Math.round(BASE_POINTS + clampedTime * TIME_BONUS_MULTIPLIER);
};

/**
 * Observer bonus when a player answers incorrectly or times out: the
 * observer earns the same as a correct answer at that speed, on the same
 * unified scale as the players they are observing.
 */
export const calculateObserverBonus = (avgTimeRemaining: number): number => {
  return calculatePoints(true, avgTimeRemaining);
};
