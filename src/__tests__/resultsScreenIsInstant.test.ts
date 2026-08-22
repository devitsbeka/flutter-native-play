import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Finishing a round must put the results screen up on the tap that asks for
 * it, not after a lap of the network.
 *
 * nextQuestion used to poll room_participants until every answering player
 * read "finished" before switching phase. Whoever finishes FIRST can never
 * satisfy that — the others are still answering — so the loop always ran to
 * its bound: six sequential round-trips interleaved with six 250ms sleeps,
 * about five seconds of a button that looked broken, ending in the same
 * partial ranking it could have shown at once. The screen needs no such wait:
 * submitAnswer awaits this player's final score before the answer is even
 * revealed, and the participants subscription re-ranks the board as the rest
 * of the room finishes.
 *
 * These assertions pin the shape rather than the timing, which is what a unit
 * test can honestly check here: the phase flip is not downstream of an await,
 * and no sleep sits in the finishing path.
 */

const CONTEXT = join(__dirname, "..", "contexts", "MultiplayerContextV2.tsx");

/** The body of nextQuestion, up to the start of the next declaration. */
function nextQuestionBody(source: string): string {
  const start = source.indexOf("const nextQuestion = useCallback");
  expect(start, "nextQuestion not found — did it get renamed?").toBeGreaterThan(-1);
  const end = source.indexOf("const applyMissedTime", start);
  expect(end, "applyMissedTime not found — the body slice is unanchored").toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("finishing a round", () => {
  const body = nextQuestionBody(readFileSync(CONTEXT, "utf8"));

  it("switches to the results phase before awaiting anything", () => {
    const phaseFlip = body.indexOf('phase: "results"');
    expect(phaseFlip, 'no phase: "results" transition in nextQuestion').toBeGreaterThan(-1);

    const beforeFlip = body.slice(0, phaseFlip);
    expect(
      /\bawait\b/.test(beforeFlip),
      "an await runs before the results phase is set — the player waits on the network " +
        "to see a screen this device can already render",
    ).toBe(false);
  });

  it("never sleeps while the player waits", () => {
    expect(
      /setTimeout\s*\(\s*resolve/.test(body),
      "a sleep is back in the finishing path; the first finisher pays all of it " +
        "and the ranking it waits for cannot arrive yet",
    ).toBe(false);
  });
});
