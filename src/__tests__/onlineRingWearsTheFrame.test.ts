/**
 * The online ring on the friends reel is the frame's (Figma 1177:14047).
 *
 * The reel drew a purple-pink-orange ring around an online friend; the
 * frame's is magenta into violet into green, at 137°, with the same 3px
 * ring, 2px white gap, 54px face and 16px glowing dot the reel already
 * had (owner: "show our online avatars strokes like this").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bar = readFileSync(join(process.cwd(), "src/components/team/FriendsStoriesBar.tsx"), "utf8");

describe("the online ring", () => {
  it("is the frame's gradient, and the only ring that changed", () => {
    expect(bar).toMatch(/const ONLINE_RING = "linear-gradient\(137deg, #B83CC9 18\.76%, #8826D3 55\.37%, #46AB1E 85\.33%\)";/);
    expect(bar).toMatch(/const OFFLINE_RING = "linear-gradient\(135deg, #94A3B8 0%, #CBD5E1 100%\)";/);
    expect(bar).not.toMatch(/#9333EA|#F97316/);
  });

  it("on the frame's geometry: 64px box, 3px ring, 2px white gap, 16px dot with the glow", () => {
    expect(bar).toMatch(/className="relative w-16 h-16 cursor-pointer/);
    expect(bar).toMatch(/className="absolute inset-0 rounded-full p-\[3px\]"/);
    expect(bar).toMatch(/<div className="w-full h-full rounded-full bg-white p-\[2px\]">/);
    expect(bar).toMatch(/absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white/);
    expect(bar).toMatch(/bg-green-500 shadow-\[0_0_8px_rgba\(34,197,94,0\.6\)\]/);
  });
});
