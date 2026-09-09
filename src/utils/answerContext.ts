/**
 * The few words under the verdict in the answer-feedback card.
 *
 * The design (Figma 1154:9157) puts a line of context beneath "it's
 * correct" — something about the answer rather than a second way of saying
 * right or wrong. `public.questions` carries no explanation column today
 * (only `king_questions` does), so when a question has no authored context
 * the line is composed from the answer itself.
 *
 * Two rules the picker exists to keep:
 *
 * - Authored context always wins. `explanation` is threaded through from the
 *   question so the day that column lands, the card reads it and nothing
 *   here has to change.
 * - The composed line is chosen by the question's id, not at random. A
 *   re-render — and every answer reveal re-renders several times — must not
 *   reshuffle the sentence the player is in the middle of reading.
 */

/** How many phrasings each verdict has in the locales. */
export const CONTEXT_LINE_COUNT = 4;

/** Stable, non-negative hash — the same question always picks the same line. */
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface AnswerContextInput {
  isCorrect: boolean;
  /** The answer as it was shown, dropped into the composed line. */
  correctAnswer: string;
  /** Authored context, when the question has any. Wins outright. */
  explanation?: string | null;
  /** What the line is keyed to — the question id, or its text as a stand-in. */
  seed: string;
}

/**
 * The translation key for the composed line, e.g. `answerFeedback.correct2`.
 *
 * Split out from `answerContextLine` so a test can assert the rotation
 * without standing up the language provider.
 */
export function answerContextKey(input: AnswerContextInput): string {
  const index = (hashSeed(input.seed) % CONTEXT_LINE_COUNT) + 1;
  return `answerFeedback.${input.isCorrect ? "correct" : "wrong"}${index}`;
}

/**
 * The line to render.
 *
 * `t` is passed in rather than imported so this stays a pure function of its
 * input — the caller already holds the hook.
 */
export function answerContextLine(
  input: AnswerContextInput,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const authored = input.explanation?.trim();
  if (authored) return authored;
  return t(answerContextKey(input), { answer: input.correctAnswer });
}
