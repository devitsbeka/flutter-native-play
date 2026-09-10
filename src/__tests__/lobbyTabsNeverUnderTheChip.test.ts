/**
 * The lobby's tabs never go under the category chip.
 *
 * The bar is sticky at the chip's underside plus 10px, and both Chromium
 * and WebKit hold it there on the test bench — and the device still
 * photographed it scrolled up under the chip (owner: "still does that, we
 * should never hide tabs here"). So the scroll listener checks where the
 * bar IS against where it should be and translates it down by the
 * difference. Where the sticky holds, the difference is zero and nothing
 * is touched.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lobby = readFileSync(join(process.cwd(), "src/components/lobby/UniversalLobby.tsx"), "utf8");

describe("the guarantee", () => {
  it("measures the bar against the chip's underside on every scroll and resize", () => {
    expect(lobby).toMatch(/<div ref=\{tabsBarRef\} className="sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20">/);
    expect(lobby).toMatch(/const line = scroller\.getBoundingClientRect\(\)\.top \+ chipClearance \+ 10;/);
    expect(lobby).toMatch(/const hold = Math\.max\(0, Math\.round\(line - natural\)\);/);
    expect(lobby).toMatch(/bar\.style\.transform = hold \? `translateY\(\$\{hold\}px\)` : "";/);
    expect(lobby).toMatch(/const onScroll = \(\) => \{\s*\n\s*measureReach\(\);\s*\n\s*holdTabsBar\(\);\s*\n\s*\};/);
    expect(lobby).toMatch(/scroller\.addEventListener\("scroll", onScroll, \{ passive: true \}\);/);
  });

  it("is a no-op where the sticky holds: the same hold is not written twice", () => {
    expect(lobby).toMatch(/if \(hold === current\) return;/);
  });
});
