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
  it("is FooterHaze upside down: the same steps, the gradients at 0deg", () => {
    const top = haze.slice(haze.indexOf("export function TopHaze"));
    expect(top).toMatch(/FOOTER_HAZE_STEPS\.map/);
    expect(top).toMatch(/linear-gradient\(0deg, transparent \$\{step\.from\}%, #000 \$\{step\.to\}%\)/);
    // It fills the box it is given; the caller sizes the ramp.
    expect(top).toMatch(/className="pointer-events-none absolute inset-0"/);
    expect(top).not.toMatch(/bottom-\[-120px\]/);
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

  it("draws the haze under the chip, from the header's underside to where the tabs park", () => {
    // Not further: the sticky tabs sit 10px under the chip, and a ramp that
    // reached past them frosted the tabs themselves.
    expect(lobby).toMatch(/<div aria-hidden className="pointer-events-none absolute inset-x-\[-100vw\] bottom-\[-10px\] top-\[-13px\] -z-10">\s*\n\s*<TopHaze \/>/);
  });

  it("runs the body up under the chip and gives the clearance back as a spacer, not padding", () => {
    // A sticky offset is measured from inside a scroller's padding in
    // Chromium, so padding put the tabs a whole clearance too low (owner:
    // "we don't need that much space between category row and game rules /
    // players row"). A spacer element is the same in every engine.
    expect(lobby).toMatch(/className="relative z-10 mt-\[calc\(var\(--chip-clearance\)\*-1\)\] min-h-0 flex-1 overflow-y-auto overflow-x-hidden"/);
    expect(lobby).not.toMatch(/pt-\[var\(--chip-clearance\)\]/);
    expect(lobby).toMatch(/<div aria-hidden className="shrink-0" style=\{\{ height: "var\(--chip-clearance\)" \}\} \/>/);
    expect(lobby).toMatch(/style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
  });

  it("and the sticky tabs stick below the chip, not at the scroller's top", () => {
    expect(lobby).toMatch(/sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20/);
    expect(lobby).not.toMatch(/sticky top-\[10px\]/);
  });

  it("and carry a haze of their own behind the bar, over the rows", () => {
    // From 10px above the bar - where the chip's ramp ends - to 28px below
    // it, spanning the card's side padding; under the bar, which draws
    // itself over it (owner: "we need blurry background behind the game
    // rules and players container, increase blurry bg height behind").
    expect(lobby).toMatch(/<div className="sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20">\s*\n(\s*\{\/\*[\s\S]*?\*\/\}\s*\n)?\s*<div aria-hidden className="pointer-events-none absolute inset-x-\[-9px\] bottom-\[-28px\] top-\[-10px\]">\s*\n\s*<TopHaze \/>\s*\n\s*<\/div>\s*\n\s*<div className="relative flex items-center/);
  });
});
