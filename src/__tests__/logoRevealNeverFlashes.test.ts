import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openTileCount, trackRun, type RevealRun } from "@/components/ui/image-reveal-mask";

/**
 * The cover over a logo must be shut before the logo is on screen.
 *
 * What players reported: "I see the logo image for a second fully and then it
 * covers with pixel animation." Both halves of that came from the same thing —
 * a question change arrives at the picture in two paints:
 *
 *   paint 1: the new question's image URL, with the OLD question's clock
 *            (at zero) and the OLD question's lifted reveal, because the
 *            parents reset those in effects, which run after the paint.
 *   paint 2: the new clock and the reveal put down.
 *
 * On paint 1 the mask computed a wide-open cover and the <img> was still
 * marked loaded from the previous picture, so the answer was legible; on
 * paint 2 the tiles — the same DOM elements, carrying a 500ms opacity
 * transition — animated shut over it. Hence "the pixels close in".
 *
 * Nothing is rendered here (there is no DOM in this suite), so the mask's
 * arithmetic is exercised directly and the two render-time resets that feed
 * it are asserted against the source.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const CARD = read("src/components/ui/quiz-question-card.tsx");
const TV = read("src/components/tv/TVQuestionScreenV4.tsx");

const TILES = 24;
const START_VISIBLE = 3;

/** Feed a sequence of renders through the run the way the component does. */
function renders(
  frames: Array<{ seed: string; progress: number; reveal?: boolean }>,
  from: RevealRun | null = null,
) {
  let run = from;
  return frames.map(({ seed, progress, reveal = false }) => {
    run = trackRun(run, seed, progress, reveal);
    return { run, opened: openTileCount(run, progress, reveal) };
  });
}

describe("the logo cover", () => {
  it("opens the same tiles as before while one question runs", () => {
    const seed = "https://example.org/playstation.png";
    const [start, middle, late] = renders([
      { seed, progress: 100 },
      { seed, progress: 50 },
      { seed, progress: 10 },
    ]);

    expect(start.opened).toBe(START_VISIBLE);
    expect(middle.opened).toBeGreaterThan(START_VISIBLE);
    expect(middle.opened).toBeLessThan(TILES);
    expect(late.opened).toBe(TILES);
  });

  it("stays shut on the paint that carries the new picture with the old clock", () => {
    // The previous question ran out: progress 0, reveal lifted. Then the
    // index moves, so the seed changes before either is reset.
    const previous = renders([
      { seed: "old.png", progress: 100 },
      { seed: "old.png", progress: 0, reveal: true },
    ]).pop()!.run;

    const [stale, fresh] = renders(
      [
        { seed: "new.png", progress: 0, reveal: true },
        { seed: "new.png", progress: 100 },
      ],
      previous,
    );

    expect(stale.opened).toBe(START_VISIBLE);
    expect(fresh.opened).toBe(START_VISIBLE);
  });

  it("still lifts the whole cover once the answer is in", () => {
    const seed = "new.png";
    const run = renders(
      [
        { seed, progress: 0, reveal: true }, // the leftover paint
        { seed, progress: 100 },
        { seed, progress: 80 },
      ],
      { seed: "old.png", top: 100, trustReveal: true },
    ).pop()!.run;

    expect(openTileCount(run, 80, true)).toBe(TILES);
  });

  it("believes a reveal that is already set when the mask first mounts", () => {
    // An observer opening the screen mid-reveal has no previous question to
    // have left anything behind, so its props are the truth.
    const [first] = renders([{ seed: "new.png", progress: 40, reveal: true }]);
    expect(first.opened).toBe(TILES);
  });

  it("measures elapsed against the highest progress this picture was shown at", () => {
    // A leftover clock is always BELOW the question's own top, so it can only
    // be the start of the arc, never the end of it.
    const seed = "new.png";
    const frames = renders(
      [
        { seed, progress: 12 },
        { seed, progress: 100 },
        { seed, progress: 12 },
      ],
      { seed: "old.png", top: 100, trustReveal: true },
    );

    expect(frames[0].opened).toBe(START_VISIBLE);
    expect(frames[1].run.top).toBe(100);
    expect(frames[2].opened).toBe(TILES);
  });

  it("gives each picture its own tiles, so a cover never animates shut", () => {
    const mask = read("src/components/ui/image-reveal-mask.tsx");
    // Keyed by the seed: a question change replaces the elements, and a new
    // element paints at its opacity instead of transitioning to it.
    expect(mask).toMatch(/key=\{`\$\{seed\}:\$\{tile\}`\}/);
  });
});

describe("the picture under it", () => {
  it("is hidden the moment the question's URL changes, not an effect later", () => {
    expect(CARD).toMatch(/if \(statusUrl !== imageUrl\) \{\s*\n\s*setStatusUrl\(imageUrl\);\s*\n\s*setImageStatus\("loading"\);/);
    // And the effect must not re-assert "loading" afterwards: a cached
    // picture's load event can beat it, and there is no second one coming.
    expect(CARD).not.toMatch(/React\.useEffect\(\(\) => \{\s*\n\s*setImageStatus\("loading"\);/);
  });

  it("is hidden on the TV the same way", () => {
    expect(TV).toMatch(/if \(loadedIndex !== currentQuestionIndex\) \{\s*\n\s*setLoadedIndex\(currentQuestionIndex\);\s*\n\s*setTvImageFailed\(false\);\s*\n\s*setTvImageLoaded\(false\);/);
  });
});
