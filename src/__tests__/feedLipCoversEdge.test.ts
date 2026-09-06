/**
 * The feed's wavy lip covers the panel's own top edge.
 *
 * The wave used to straddle the panel's edge (6px above, 6px below), so at
 * every trough the lip was transparent exactly where the edge sat, and the
 * edge — antialiased because the panel's corners were rounded — showed
 * through as a hairline under the wave on scroll. The whole wave now sits
 * above the edge, with solid lip over it, and the panel has no corners to
 * antialias.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { waveStripPath } from "@/components/home/wave";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const scroll = read("src/components/home/MobileHomeScroll.tsx");

describe("the lip's geometry", () => {
  it("sits its wave above the panel's edge and its body over it", () => {
    expect(scroll).toMatch(/const LIP_CLEAR = 2;/);
    expect(scroll).toMatch(/const LIP_DEPTH = 16;/);
    expect(scroll).toMatch(/useWaveStrip\(500, FEED_WAVE, "top", LIP_CLEAR \+ LIP_DEPTH\)/);
    expect(scroll).toMatch(
      /style=\{\{ top: -\(FEED_WAVE \+ LIP_CLEAR\), height: FEED_WAVE \+ LIP_CLEAR \+ LIP_DEPTH, \.\.\.lip \}\}/,
    );
  });

  it("and the panel has no rounded corners to draw an antialiased edge with", () => {
    expect(scroll).toMatch(/className="relative z-10 min-h-full bg-\[#faf6ff\]"/);
    expect(scroll).not.toMatch(/rounded-t-\[28px\] bg-\[#faf6ff\]/);
  });

  it("a strip with depth is filled solid past the wave, down to its bottom", () => {
    const d = waveStripPath(7, 500, 12, "top", 18);
    // Closes along y = band + depth, the strip's bottom.
    expect(d).toMatch(/L500 30L0 30Z$/);
    // And the wave's points all lie within the top band.
    const ys = [...d.matchAll(/ (-?\d+(?:\.\d+)?)(?=[CL]| ?$)/g)].map((m) => Number(m[1]));
    expect(ys.every((y) => y >= 0 && y <= 30)).toBe(true);
  });
});
