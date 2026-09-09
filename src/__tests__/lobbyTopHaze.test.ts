/**
 * The lobby's body scrolls up under the category chip into the same haze
 * it scrolls down under the footer into.
 *
 * The chip sat over the body's top edge with nothing between them: the
 * tabs card was cut off at a hard line under the chip while the bottom of
 * the same screen frosted gently under the Start button (owner: "use same
 * blur in top while scrolling what we use in bottom - behind the purple
 * button").
 *
 * So the body pulls itself up under the chip by the chip's measured height
 * and pads by the same, the sticky tabs add that to their offset, and a
 * TopHaze - FooterHaze's four masked layers and tint, every gradient turned
 * upside down - sits under the chip from the header's underside to 120px
 * below the chip.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const haze = read("src/components/shared/FooterHaze.tsx");

describe("TopHaze", () => {
  it("is FooterHaze upside down: the same steps, the gradients at 0deg, reaching 120px down", () => {
    const top = haze.slice(haze.indexOf("export function TopHaze"));
    expect(top).toMatch(/FOOTER_HAZE_STEPS\.map/);
    expect(top).toMatch(/linear-gradient\(0deg, transparent \$\{step\.from\}%, #000 \$\{step\.to\}%\)/);
    expect(top).toMatch(/className="pointer-events-none absolute inset-x-0 top-0 bottom-\[-120px\]"/);
    expect(top).toMatch(/linear-gradient\(0deg, rgba\(\$\{tint\},0\) 0%, rgba\(\$\{tint\},0\.05\) 40%, rgba\(\$\{tint\},0\.2\) 72%, rgba\(\$\{tint\},0\.46\) 100%\)/);
    expect(top).not.toMatch(/180deg/);
  });
});

describe("the lobby", () => {
  it("measures the chip row and publishes the clearance as a CSS variable", () => {
    expect(lobby).toMatch(/const \[chipClearance, setChipClearance\] = useState\(0\);/);
    expect(lobby).toMatch(/const update = \(\) => setChipClearance\(el\.offsetHeight \+ 13\);/);
    expect(lobby).toMatch(/"--chip-clearance": `\$\{chipClearance\}px`/);
  });

  it("draws the haze under the chip, from the header's underside", () => {
    expect(lobby).toMatch(/<div aria-hidden className="pointer-events-none absolute inset-x-\[-100vw\] bottom-0 top-\[-13px\] -z-10">\s*\n\s*<TopHaze \/>/);
  });

  it("runs the body up under the chip and pads by the same, keeping the footer padding as it was", () => {
    expect(lobby).toMatch(/className="relative z-10 mt-\[calc\(var\(--chip-clearance\)\*-1\)\] min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-\[var\(--chip-clearance\)\]"/);
    expect(lobby).toMatch(/style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
  });

  it("and the sticky tabs stick below the chip, not at the scroller's top", () => {
    expect(lobby).toMatch(/sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20/);
    expect(lobby).not.toMatch(/sticky top-\[10px\]/);
  });
});
