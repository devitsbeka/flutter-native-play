/**
 * A room round advances itself; solo play still waits to be told.
 *
 * A room is people playing together, and a "Next question" button between
 * every question made that a race of taps: the fast player sat on the next
 * question while the slow one was still reading a result, and a phone put
 * down mid-round held nothing but its own screen. The TV has always advanced
 * on a timer for exactly this reason. A room is the same game with the
 * screens in people's hands (owner: "in public / private rooms matches we
 * need to have auto next question, without 'next question' button").
 *
 * Discover's solo quiz keeps its button, and that is not a compromise: one
 * person reading at their own pace is what the button is for (owner: "we
 * have next question button when user plays from discover page"). The two
 * screens share no component, so this is two files, not a mode flag.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const room = read("src/components/team/MultiplayerGameScreenV2.tsx");
const solo = read("src/pages/CategoryQuizPage.tsx");

describe("the room's round moves on by itself", () => {
  it("holds the reveal for a readable beat, then advances", () => {
    expect(room).toMatch(/const REVEAL_HOLD_MS = \d+;/);
    expect(room).toMatch(/const timer = setTimeout\(handleNext, REVEAL_HOLD_MS\);/);
    expect(room).toMatch(/return \(\) => clearTimeout\(timer\);/);
  });

  it("only once the answer is actually revealed", () => {
    expect(room).toMatch(/if \(!answerRevealed\) return;/);
  });

  it("and a vote round waits for its tally before counting the beat", () => {
    // The reveal lands before the votes are in — "waiting for votes" is on
    // screen at that moment — so advancing then would take the answer away
    // before it arrived.
    expect(room).toMatch(/if \(isMostLikelyRound && !voteResult\) return;/);
  });

  it("re-armed per question, so one reveal cannot advance twice", () => {
    // The effect is keyed on the index, and handleNext's own ref refuses a
    // second advance from the same question either way.
    expect(room).toMatch(
      /\}, \[answerRevealed, isMostLikelyRound, voteResult, currentQuestionIndex, handleNext\]\);/,
    );
    expect(room).toMatch(/if \(advancedFromRef\.current === currentQuestionIndex\) return;/);
  });
});

describe("the button it replaces", () => {
  it("is gone from the room screen — no tap advances a round any more", () => {
    expect(room).not.toMatch(/onClick=\{handleNext\}/);
    expect(room).not.toMatch(/t\("game\.nextQuestion"\)/);
    // And with it the import it was the last user of.
    expect(room).not.toMatch(/ChunkyButton/);
  });

  it("leaves a word about what is coming, not a control", () => {
    expect(room).toMatch(/t\("extra\.nextQuestionSoon"\)/);
    // The last question still says where it is going.
    expect(room).toMatch(/isLastQuestion \? t\("game\.viewResults"\) : t\("extra\.nextQuestionSoon"\)/);
  });

  it("in every language, since it is on screen once a question", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/nextQuestionSoon: "[^"]+",/);
    }
  });
});

describe("Discover's solo quiz is untouched", () => {
  it("still has the button, and the handler behind it", () => {
    expect(solo).toMatch(/onClick=\{handleNextQuestion\}/);
    expect(solo).toMatch(/t\("extra\.quizNextQuestion"\)/);
  });

  it("and no timer was added to advance it for the reader", () => {
    expect(solo).not.toMatch(/REVEAL_HOLD_MS/);
  });

  it("which is safe because neither screen renders the other", () => {
    // Two independent implementations, not one component with a mode flag.
    // If they ever merge, this is the reminder that one of them wants a
    // timer and the other wants a button. (Prose may name the other file —
    // it is the import that would make them one screen.)
    expect(solo).not.toMatch(/^import .*MultiplayerGameScreenV2/m);
    expect(room).not.toMatch(/^import .*CategoryQuizPage/m);
  });
});
