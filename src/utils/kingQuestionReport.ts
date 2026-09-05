/**
 * What a "this question is wrong" report carries.
 *
 * The King's pool is seeded (supabase/migrations/*king_seed*), so a bad
 * puzzle — a wrong answer key, a translation that lost the logic, a
 * duplicate — is a data bug, and the player staring at the reveal is the
 * only one who ever sees it. The flag under the explanation is how it gets
 * back to us.
 *
 * The client cannot name the question it is reporting: `king_questions` has
 * no client read policy and neither king_state nor king_team_state sends an
 * id back, only the text. So a report is identified the way a person would
 * identify it — the question as it was shown, its language, and the answer
 * the server called correct — which is enough to find the row and fix it.
 *
 * The row builders are pure so the shape can be executed in a test rather
 * than read; the two inserts live at the call site.
 */

export interface KingReportInput {
  userId: string | null;
  language: string;
  /** Solo King, or the co-op duel against him. */
  mode: "solo" | "team";
  matchId: string | null;
  roomId: string | null;
  questionNumber: number | null;
  questionText: string;
  correctAnswer: string | null;
}

/** The report_type filed against user_reports; also the admin page's label key. */
export const KING_REPORT_TYPE = "king_question";

/** Longest description we will send — user_reports.description is free text. */
const NOTE_MAX = 900;

/**
 * The human-readable one-liner.
 *
 * This is what shows on the admin Reports page, so it leads with the
 * question: that is what has to be recognised and fixed. Truncated because
 * an explanation can run long and the column is read in a list.
 */
export function kingReportNote(input: KingReportInput): string {
  const parts = [
    `[king/${input.mode}] ${input.language}`,
    input.questionNumber != null ? `q${input.questionNumber}` : null,
    `“${input.questionText}”`,
    input.correctAnswer ? `answer: ${input.correctAnswer}` : null,
    input.matchId ? `match ${input.matchId}` : null,
  ].filter(Boolean);
  const note = parts.join(" · ");
  return note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX - 1)}…` : note;
}

/** The structured row, once 20261003100000 has been applied. */
export function kingReportRow(input: KingReportInput) {
  return {
    user_id: input.userId,
    language: input.language,
    mode: input.mode,
    match_id: input.matchId,
    room_id: input.roomId,
    question_number: input.questionNumber,
    question_text: input.questionText,
    correct_answer: input.correctAnswer,
  };
}

/**
 * The row that lands on the admin Reports page.
 *
 * `user_reports.reported_user_id` is NOT NULL and a question is not a
 * person, so the reporter stands in for themselves — the same stand-in
 * WordInfoModal uses for a bad Words word. This one is written on EVERY
 * report, not only when the dedicated table is missing: the admin page
 * reads user_reports and nothing else, and a report nobody can read is not
 * a report.
 */
export function kingReportFallbackRow(input: KingReportInput) {
  if (!input.userId) return null;
  return {
    reporter_id: input.userId,
    reported_user_id: input.userId,
    report_type: KING_REPORT_TYPE,
    description: kingReportNote(input),
    room_id: input.roomId,
  };
}
