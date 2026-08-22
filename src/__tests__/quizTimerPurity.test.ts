import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A countdown tick may not reveal an answer from inside a state updater.
 *
 * CategoryQuizPage ran the clock like this:
 *
 *   setTimeRemaining((prev) => {
 *     if (prev <= 1) { handleTimeUp(); return 0; }   // ← side effect
 *     return prev - 1;
 *   });
 *
 * An updater has to be pure: React is free to call it more than once, and the
 * `setIsAnswered(true)` this queued could land after the player had already
 * pressed "Next question" — marking the question they had just arrived at as
 * answered by nobody, correct option already green, before they had read it.
 *
 * The clock was the tell. A real timeout reads 0; the affected questions
 * showed whatever the *new* question had counted down to.
 *
 * Running out of time is now noticed by an effect that reads live state, so it
 * can only ever apply to the question on screen. This test keeps the side
 * effect from creeping back into an updater — in the solo page or in the
 * multiplayer screen, which had its own version of the same bug.
 */

const FILES = [
  "src/pages/CategoryQuizPage.tsx",
  "src/components/team/MultiplayerGameScreenV2.tsx",
];

/**
 * The bodies of every `setX((prev) => ...)` style updater in a file.
 *
 * Deliberately crude: it takes the text from an arrow-function updater to the
 * end of that statement. Good enough to catch a call the updater makes, which
 * is the thing being forbidden.
 */
function updaterBodies(source: string): string[] {
  const bodies: string[] = [];
  // State setters only. `setInterval` and `setTimeout` also read as set+capital
  // and their callbacks are allowed to have effects — that is what they are
  // for — so matching them swallowed whole timer bodies and reported them.
  const opener = /\bset(?!Interval\b|Timeout\b|Immediate\b)[A-Z]\w*\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(source)) !== null) {
    // Walk from the updater's opening brace to its matching close.
    let depth = 1;
    let i = opener.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    bodies.push(source.slice(opener.lastIndex, i));
  }
  return bodies;
}

/** Calls that change something outside the value being computed. */
// handleAnswer belongs here as much as handleTimeUp does, and its absence
// was not theoretical: the multiplayer clock called handleAnswer("") from
// inside its updater for as long as this test had been "covering" that file.
// It submits an answer and reveals it, so a repeated updater could submit
// twice — and the guard it opens with reads a captured selectedAnswer.
const FORBIDDEN = /\b(handleTimeUp|handleAnswer|submitAnswer|setIsAnswered|setSelectedAnswer|setAnswerRevealed|setShowResults)\s*\(/;

describe("quiz countdown updaters stay pure", () => {
  it("finds updaters to check", () => {
    const found = FILES.flatMap((f) =>
      updaterBodies(readFileSync(join(process.cwd(), f), "utf8")),
    );
    expect(found.length).toBeGreaterThan(0);
  });

  for (const file of FILES) {
    it(`${file}: no updater reveals an answer`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      const offending = updaterBodies(source).filter((body) => FORBIDDEN.test(body));

      expect(
        offending.map((b) => b.trim().slice(0, 120)),
        `A setState updater in ${file} calls something that reveals an answer. ` +
          `React may run an updater more than once and its queued state can land ` +
          `after the player has moved on, which opens the next question already ` +
          `answered. Do it in an effect that reads live state instead.`,
      ).toEqual([]);
    });
  }
});

/**
 * The clock has to measure seconds, not ticks.
 *
 * points = 100 + round(timeRemaining) x 10, so timeRemaining decides the
 * score. The multiplayer clock used to be a setInterval subtracting a flat
 * 0.1 every 100ms — but setInterval is not a clock: browsers fire it late
 * under load and throttle it on phones, and every late tick still took only
 * 0.1 off. A slower device therefore held a HIGHER timeRemaining for the
 * same real-world speed and scored MORE, which is backwards.
 *
 * Both screens read real elapsed time from a timestamp now.
 */
describe("the question clock measures real time", () => {
  it("MultiplayerGameScreenV2 ticks off a timestamp, not a fixed decrement", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/team/MultiplayerGameScreenV2.tsx"),
      "utf8"
    );

    // An anchor taken when the question opens, and a tick that reads it.
    expect(source, "expected a per-question start timestamp").toMatch(/questionStartedAt/);
    expect(
      source,
      "the interval must compute remaining time from Date.now(), not subtract a constant"
    ).toMatch(/setInterval\([\s\S]{0,400}?Date\.now\(\)\s*-\s*questionStartedAt/);

    // The shape that caused the drift.
    expect(
      source,
      "no fixed-decrement clock: it pays whoever has the slower phone"
    ).not.toMatch(/setTimeRemaining\(\s*\(prev\)\s*=>\s*prev\s*-\s*0\.1/);
  });
});
