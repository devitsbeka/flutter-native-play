/**
 * The after-answer card is off for now.
 *
 * Once an answer was in, a card slid over the next button — "Not quite",
 * a heart, a report flag, and a line that for most questions only said
 * which answer was right, which the green row above it already did. It
 * sat on the frosted foot, so the answer the player had just chosen was
 * blurred out under it (owner: "hide this feature (modals after answer
 * reveal) for now, it covers last answer with blur and gives us no new
 * info about the question or answer, we don't need it for now during the
 * game plays, hide it").
 *
 * One flag, both screens. The card itself stays whole for when it comes
 * back with something worth reading.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const card = read("src/components/game/AnswerFeedbackCard.tsx");
const level = read("src/pages/CategoryQuizPage.tsx");
const quick = read("src/components/game/QuizGameScreenProd.tsx");

describe("the after-answer card is off", () => {
  it("one flag, and it is false", () => {
    expect(card).toMatch(/export const ANSWER_FEEDBACK_CARD_SHOWN = false;/);
  });

  it("the level page gates on it", () => {
    expect(level).toMatch(/import \{ ANSWER_FEEDBACK_CARD_SHOWN, AnswerFeedbackCard \}/);
    expect(level).toMatch(/\{ANSWER_FEEDBACK_CARD_SHOWN && isAnswered && currentQuestion && \(/);
  });

  it("and so does the quick game", () => {
    expect(quick).toMatch(/import \{ ANSWER_FEEDBACK_CARD_SHOWN, AnswerFeedbackCard \}/);
    expect(quick).toMatch(/\{ANSWER_FEEDBACK_CARD_SHOWN && answerRevealed && currentQuestion && \(/);
  });

  it("neither draws the card any other way", () => {
    expect((level.match(/<AnswerFeedbackCard/g) ?? []).length).toBe(1);
    expect((quick.match(/<AnswerFeedbackCard/g) ?? []).length).toBe(1);
  });
});
