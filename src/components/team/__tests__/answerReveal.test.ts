import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A result may only reveal the question it is the result of.
 *
 * This is a regression test for a bug that reached players: the reveal was
 * made instant (it used to wait on four network round trips), which meant a
 * player could tap Next before their answer finished being written. The
 * result then landed against whatever question was on screen by then, and the
 * correct option appeared already green on a question nobody had answered.
 *
 * The reveal itself lives in a React effect over context state and is not
 * reachable without rendering a room, so what is asserted here is the rule
 * that makes it safe: the result carries the question index, and both the
 * reveal and the away-time check compare against it. A future edit that drops
 * the comparison brings the bug back, and this is what notices.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const SCREEN = read("src/components/team/MultiplayerGameScreenV2.tsx");
const CONTEXT = read("src/contexts/MultiplayerContextV2.tsx");

describe("answer reveal", () => {
  it("stamps the result with the question it belongs to", () => {
    expect(CONTEXT).toMatch(/lastQuestionResult:\s*\{[^}]*questionIndex:\s*number/s);
    expect(CONTEXT).toMatch(/questionIndex:\s*state\.currentQuestionIndex/);
  });

  it("only reveals when the result is for the question on screen", () => {
    // The exact shape matters less than that a comparison exists — a bare
    // `if (lastQuestionResult)` is the bug.
    expect(SCREEN).toMatch(/lastQuestionResult\?\.questionIndex\s*===\s*currentQuestionIndex/);
    expect(SCREEN).not.toMatch(/if\s*\(lastQuestionResult\)\s*setAnswerRevealed/);
  });

  it("reveals from the local answer rather than from the network", () => {
    // The point of the instant reveal: the correct answer is already on the
    // device, so nothing has to be waited for to colour the buttons. Vote
    // rounds ("Most Likely To") branch first — they have no local verdict to
    // sound out — but the reveal itself stays instant for both.
    expect(SCREEN).toMatch(
      /setAnswerRevealed\(true\);\s*\n\s*if \(isMostLikelyRound\) \{[\s\S]{0,200}?\} else if \(answer === currentQuestion\?\.correctAnswer\)/,
    );
  });

  it("clears the reveal when the question changes", () => {
    // Without this every question after the first would open revealed.
    expect(SCREEN).toMatch(/setAnswerRevealed\(false\)/);
  });

  it("decides away-time skipping by index too", () => {
    // Nothing clears the previous result when the next question starts, so a
    // null check answered "yes, already answered" for every question after
    // the first one the player answered.
    expect(CONTEXT).toMatch(
      /answeredCurrent\s*=\s*state\.lastQuestionResult\?\.questionIndex\s*===\s*state\.currentQuestionIndex/,
    );
  });
});
