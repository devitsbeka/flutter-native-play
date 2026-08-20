/**
 * Whether the question on screen has been answered, and with what.
 *
 * A quiz screen holds one answer at a time, and the bug this exists to
 * prevent is that answer outliving the question it belongs to. It has
 * happened twice:
 *
 *  - a countdown tick revealed the answer from inside a state updater, so the
 *    reveal could land after the player had moved on (fixed in 778f254);
 *  - resetQuiz — the Try again and Replay buttons — cleared eighteen pieces
 *    of state and not the two that say a question was answered. A replay
 *    keeps the same levelId, so the effect that does clear them never ran,
 *    and question one opened with the last question's answer still green.
 *
 * Both are the same fault: an answer stored as a bare boolean, with nothing
 * tying it to a question. Storing the index with the answer makes the bad
 * state unrepresentable — an answer to question 3 is not an answer to
 * question 4 — so moving on un-answers by construction, and a late write
 * naming an older question cannot apply to the current one.
 */
export interface QuizAnswerRecord {
  /** The question this answer was given to. */
  questionIndex: number;
  /** What was picked, or null when the clock ran out. */
  choice: string | null;
}

export interface QuizAnswerState {
  isAnswered: boolean;
  selectedAnswer: string | null;
}

export function answerStateFor(
  record: QuizAnswerRecord | null | undefined,
  questionIndex: number
): QuizAnswerState {
  const isAnswered = !!record && record.questionIndex === questionIndex;
  return { isAnswered, selectedAnswer: isAnswered ? record!.choice : null };
}
