import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { answerStateFor } from "@/utils/quizAnswerState";

/**
 * A question must never open already answered.
 *
 * Reported twice by players: a category question showing its correct answer
 * green before they had touched it. The first cause was a countdown that
 * revealed the answer from inside a state updater (778f254). The second was
 * resetQuiz — the Try again and Replay buttons — which clears eighteen
 * pieces of state and did not clear the two that mark a question answered.
 * A replay keeps the same levelId, so the effect that does clear them never
 * ran, and question one inherited the last question's answer.
 *
 * The rule below is what makes that impossible now, so it is what gets
 * tested: an answer belongs to one question, and applies to no other.
 */
describe("an answer applies only to its own question", () => {
  it("a question with no answer yet is unanswered", () => {
    expect(answerStateFor(null, 0)).toEqual({ isAnswered: false, selectedAnswer: null });
  });

  it("the question that was answered shows the choice", () => {
    expect(answerStateFor({ questionIndex: 2, choice: "Paris" }, 2)).toEqual({
      isAnswered: true,
      selectedAnswer: "Paris",
    });
  });

  it("a timeout answers the question with no choice", () => {
    expect(answerStateFor({ questionIndex: 2, choice: null }, 2)).toEqual({
      isAnswered: true,
      selectedAnswer: null,
    });
  });

  // The replay bug, stated as a test: an answer to the last question of the
  // previous run must not make question one look answered.
  it("an answer to another question does not answer this one", () => {
    expect(answerStateFor({ questionIndex: 9, choice: "Paris" }, 0)).toEqual({
      isAnswered: false,
      selectedAnswer: null,
    });
  });

  // A late write — a timer or a network reply naming the question the player
  // has already left — cannot reach forward either.
  it("an answer from a question already left does not apply to the next one", () => {
    expect(answerStateFor({ questionIndex: 3, choice: "Rome" }, 4)).toEqual({
      isAnswered: false,
      selectedAnswer: null,
    });
  });
});

/**
 * The structural half. Deriving is only safe while the screen has no second,
 * independent record of "answered" that something could forget to clear —
 * which is exactly what the two previous bugs were.
 */
describe("the quiz screens keep no independent answered flag", () => {
  it("CategoryQuizPage derives its answered state rather than storing it", () => {
    const source = readFileSync(join(process.cwd(), "src/pages/CategoryQuizPage.tsx"), "utf8");

    // useState<boolean> called isAnswered/hasAnswered is the shape that has to
    // be reset by hand on every path that moves questions — and was not.
    const ownFlag = /const\s*\[\s*(is|has)?[Aa]nswered\s*,\s*set(Is|Has)?Answered\s*\]\s*=\s*useState/;
    expect(source, "CategoryQuizPage should derive answered state from the question index")
      .not.toMatch(ownFlag);
  });

  // The multiplayer screen keeps its own flags, which is safe for a different
  // reason: it clears them from an effect keyed on the question index, so no
  // handler can forget. Asserted rather than assumed — the two screens have
  // had the same bug before, and this is the property that keeps this one out
  // of it.
  it("MultiplayerGameScreenV2 clears its answer from an effect on the question index", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/team/MultiplayerGameScreenV2.tsx"), "utf8"
    );
    const effect = source.match(
      /useEffect\(\(\)\s*=>\s*\{[^}]*setAnswerRevealed\(false\)[^}]*\}\s*,\s*\[([^\]]*)\]/
    );
    expect(effect, "expected an effect that clears the revealed answer").not.toBeNull();
    expect(effect![1], "that effect must be keyed on the question index")
      .toContain("currentQuestionIndex");
  });

  it("CategoryQuizPage clears the answer when a replay restarts the quiz", () => {
    const source = readFileSync(join(process.cwd(), "src/pages/CategoryQuizPage.tsx"), "utf8");
    const resetQuiz = source.slice(source.indexOf("const resetQuiz"));
    const body = resetQuiz.slice(0, resetQuiz.indexOf("}, ["));

    // Deriving already covers this, since resetQuiz sends the index back to 0.
    // Belt and braces: a replay should not inherit a spent clock either, and
    // a reader should not have to reason about derivation to see that.
    expect(body, "resetQuiz should clear the answer record").toContain("setAnswerRecord(null)");
    expect(body, "resetQuiz should put the clock back").toContain("setTimeRemaining(");
  });
});
