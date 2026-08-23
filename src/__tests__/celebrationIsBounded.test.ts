import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A celebration has to end.
 *
 * The match result screen — the one shown after EVERY game — emitted eight
 * confetti particles every 30ms from a setInterval with no stop condition.
 * That is ~260 new particles a second, each living 400 frames, settling at
 * roughly 1,700 particles redrawn on the canvas every frame for as long as
 * the player sat there reading their score. Players reported phones getting
 * hot enough that iOS told them to put the device down.
 *
 * The emitter must stop on its own. This pins that: the interval callback
 * has to clear itself against a deadline, not run until the screen unmounts.
 */
describe("the result screen's confetti stops on its own", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/game/MatchResultScreen.tsx"),
    "utf8",
  );

  it("clears its own interval once the burst is over", () => {
    const emitter = source.match(/const interval = window\.setInterval\(([\s\S]*?)\}, 30\);/);
    expect(emitter, "expected the confetti emitter interval").not.toBeNull();
    expect(
      emitter![1],
      "the emitter must stop itself — unmount is not a stop condition",
    ).toMatch(/clearInterval\(interval\)/);
  });

  it("bounds the burst to a couple of seconds", () => {
    const ms = source.match(/const EMIT_MS = (\d+);/);
    expect(ms, "expected an explicit emit duration").not.toBeNull();
    const duration = Number(ms![1]);
    expect(duration).toBeGreaterThan(0);
    // Long enough to read as a celebration, short enough that the canvas is
    // empty again while the player is still deciding what to do next.
    expect(duration).toBeLessThanOrEqual(4000);
  });

  it("still cleans up when the screen goes away mid-burst", () => {
    expect(source).toMatch(/return \(\) => \{[\s\S]*?clearInterval\(interval\)[\s\S]*?myConfetti\.reset\(\)/);
  });
});
