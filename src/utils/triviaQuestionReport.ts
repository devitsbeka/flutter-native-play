/**
 * What a "this question is wrong" report on the main trivia bank carries.
 *
 * Same shape, and same reason, as the King's report
 * (src/utils/kingQuestionReport.ts): a bad question — wrong answer key,
 * translation that lost the point, duplicate — is a data bug, and the only
 * person who ever sees it is the player looking at the reveal. The flag in
 * the answer-feedback card is how it gets back to us.
 *
 * Unlike the King's pool this one HAS an id the client can name, so a report
 * carries it and triage is a join rather than a text match. The text still
 * rides along: a question can be edited between the report and the triage,
 * and then the id alone no longer says what was on screen.
 *
 * The row builders are pure so the shape can be executed in a test; the
 * inserts live at the call site.
 */

export interface TriviaReportInput {
  userId: string | null;
  questionId: string | null;
  questionText: string;
  correctAnswer: string | null;
  language: string;
  /** Which screen the player flagged it from. */
  source: "category" | "quick-game";
}

/**
 * The report_type filed against user_reports.
 *
 * Added to that column's CHECK by
 * 20261103100000_question_favorites_and_reports.sql. Before that migration
 * runs, an insert carrying it comes back 23514 and files nothing — which is
 * why the call site retries under REPORT_TYPE_FALLBACK rather than telling
 * the player their report went through.
 */
export const TRIVIA_REPORT_TYPE = "trivia_question";

/** One of the original five, so it is accepted by every deployed database. */
export const REPORT_TYPE_FALLBACK = "other";

/** Longest description we will send — user_reports.description is free text. */
const NOTE_MAX = 900;

/**
 * The human-readable one-liner.
 *
 * This is what shows on the admin Reports page, so it leads with the
 * question: that is what has to be recognised and fixed.
 */
export function triviaReportNote(input: TriviaReportInput): string {
  const parts = [
    `[trivia/${input.source}] ${input.language}`,
    `“${input.questionText}”`,
    input.correctAnswer ? `answer: ${input.correctAnswer}` : null,
    input.questionId ? `question ${input.questionId}` : null,
  ].filter(Boolean);
  const note = parts.join(" · ");
  return note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX - 1)}…` : note;
}

/** The structured row, once 20261103100000 has been applied. */
export function triviaReportRow(input: TriviaReportInput) {
  return {
    user_id: input.userId,
    question_id: input.questionId,
    question_text: input.questionText,
    correct_answer: input.correctAnswer,
    language: input.language,
    source: input.source,
  };
}

/**
 * The row that lands on the admin Reports page.
 *
 * `user_reports.reported_user_id` is NOT NULL and a question is not a
 * person, so the reporter stands in for themselves — the stand-in the King's
 * flag and the Words flag both use. Written on EVERY report, not only when
 * the dedicated table is missing: the admin page reads user_reports and
 * nothing else, and a report nobody can read is not a report.
 */
export function triviaReportFallbackRow(
  input: TriviaReportInput,
  reportType: string = TRIVIA_REPORT_TYPE,
) {
  if (!input.userId) return null;
  return {
    reporter_id: input.userId,
    reported_user_id: input.userId,
    report_type: reportType,
    description: triviaReportNote(input),
  };
}

/** Postgres' check_violation — the report_type CHECK has not been widened yet. */
export const CHECK_VIOLATION = "23514";
