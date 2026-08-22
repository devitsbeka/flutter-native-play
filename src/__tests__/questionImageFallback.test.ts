import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An image question must never be left unanswerable.
 *
 * Image questions hide the question text — the picture is the question. So
 * when the picture does not arrive, the card has to show the text instead,
 * or the player is looking at four answers and nothing to answer.
 *
 * onError alone does not cover it. A request that is refused fires onError;
 * a request that is never answered fires nothing, and the card sits blank
 * for the whole question. Measured in a browser before this was fixed:
 *
 *   image returns 429  -> text shown          (onError did its job)
 *   image hangs        -> card completely blank
 *
 * That is the live failure mode, not a hypothetical one. All 4,239 image
 * questions point at upload.wikimedia.org, which rate-limits: some requests
 * come back 429 and some just stall.
 *
 * The wait is bounded now, so the text appears either way.
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
      "the timer must move a still-loading image to error, so the text can take over"
    ).toMatch(/"error"/);
  });

  it("still reacts to an image that fails outright", () => {
    // A refusal goes through the retry handler now (a cold edge can 429 the
    // first player at that location, and a second ask usually succeeds), but
    // the chain must still bottom out in the error status so the text can
    // take over when the retries are spent.
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

  it("shows the question text whenever the image did not arrive", () => {
    // hideQuestionText must be conditional on the image having worked.
    expect(source).toMatch(/effectiveHideText\s*=\s*hideQuestionText\s*&&\s*!imageFailed/);
    expect(source).toMatch(/\{!effectiveHideText\s*&&\s*\(/);
  });
});
