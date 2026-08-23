import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An image question must never leave the card blank.
 *
 * onError alone does not cover it. A request that is refused fires onError;
 * a request that is never answered fires nothing, and the card sits blank
 * for the whole question. Measured in a browser before this was fixed:
 *
 *   image returns 429  -> handled            (onError did its job)
 *   image hangs        -> card completely blank
 *
 * That is the live failure mode, not a hypothetical one. Every image question
 * points at upload.wikimedia.org, which rate-limits: some requests come back
 * 429 and some just stall. The wait is bounded, so the card resolves either
 * way.
 *
 * What it resolves TO changed. This file used to require the question's own
 * text to take over, on the reasoning that four answers with nothing to
 * answer is worse than a stem. It is not better: every stem on a picture
 * question in this bank is generic — "Which animal is shown?", "Which
 * brand's logo is this?" — so it answers nothing without the picture, and it
 * puts a line of text on a card that is meant to be wordless. The band now
 * says the picture did not load. See pictureQuestionsStayWordless.test.ts,
 * which pins the other half.
 */
describe("a question image cannot leave the card blank", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/ui/quiz-question-card.tsx"),
    "utf8"
  );

  it("bounds how long it waits for the image", () => {
    // The effect that resets status on a new URL must also arm a timer that
    // gives up. Without it a stalled request never resolves either way.
    const effect = source.match(
      /React\.useEffect\(\(\)\s*=>\s*\{[\s\S]*?setImageStatus\("loading"\)[\s\S]*?\}\s*,\s*\[imageUrl\]\)/
    );
    expect(effect, "expected the effect that resets image status per URL").not.toBeNull();
    expect(
      effect![0],
      "the image wait must be bounded — a stalled request fires neither load nor error"
    ).toMatch(/setTimeout/);
    expect(
      effect![0],
      "the timer must move a still-loading image to error, so the band can say so"
    ).toMatch(/"error"/);
  });

  it("still reacts to an image that fails outright", () => {
    // A refusal goes through the retry handler now (a cold edge can 429 the
    // first player at that location, and a second ask usually succeeds), but
    // the chain must still bottom out in the error status so the band can
    // say so when the retries are spent.
    expect(source).toMatch(/onError=\{handleImageError\}/);
    const handler = source.match(
      /const handleImageError = [\s\S]*?\n    \};/
    );
    expect(handler, "expected the retry-then-fail image error handler").not.toBeNull();
    expect(
      handler![0],
      "exhausted retries must end in the error status, or the card stays blank"
    ).toMatch(/setImageStatus\("error"\)/);
    expect(handler![0], "the handler must actually retry before giving up").toMatch(
      /setImageAttempt/
    );
  });

  it("puts something in the band when the image did not arrive", () => {
    // Not the question text — see the note above. The band has to render
    // even on failure, or the card is a white box with four options under it.
    expect(source).toMatch(/const hasImage = !!imageUrl;/);
    expect(
      source,
      "a failed image must leave a message behind"
    ).toContain("extra.questionImageFailed");
    expect(source).toMatch(/\{imageFailed && \(/);
  });
});
