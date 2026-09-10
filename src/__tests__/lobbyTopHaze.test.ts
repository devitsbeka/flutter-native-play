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
    expect(lobby).toMatch(/className="relative z-10 mt-\[calc\(var\(--chip-clearance\)\*-1\)\] min-h-0 flex-1 overflow-y-auto overflow-x-hidden \[overflow-anchor:none\]"/);
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
    expect(lobby).toMatch(/<div ref=\{tabsBarRef\} className="sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20">\s*\n(\s*\{\/\*[\s\S]*?\*\/\}\s*\n)?\s*<div aria-hidden className="pointer-events-none absolute inset-x-\[-9px\] bottom-\[-28px\] top-\[-10px\]">\s*\n\s*<TopHaze \/>\s*\n\s*<\/div>\s*\n\s*<div className="relative flex items-center/);
  });
});

describe("the card can always reach the chip", () => {
  it("a spacer after the column adds exactly the scroll room the card is short by", () => {
    // A short list stopped mid-screen: sticky holds only once the card has
    // scrolled up to the tabs' line (owner: "when i switch to players
    // scroll stops in the middle, make sure scroll goes all the way up").
    expect(lobby).toMatch(/const \[reachSpacer, setReachSpacerState\] = useState\(0\);/);
    expect(lobby).toMatch(/const stickyLine = chipClearance \+ 10;\s*\n\s*const natural = column\.offsetHeight \+ footerHeight \+ FOOTER_HAZE_PX - scroller\.clientHeight;\s*\n\s*const need = card\.offsetTop - stickyLine;/);
    expect(lobby).toMatch(/Math\.ceil\(need - natural\)/);
    // Outside the min-h-full column, so the at-rest layout is untouched.
    expect(lobby).toMatch(/<\/motion\.section>\s*\n\s*<\/div>\s*\n\s*\{\/\*[^*]*\*\/\}\s*\n\s*<div aria-hidden className="shrink-0" style=\{\{ height: reachSpacer \}\} \/>\s*\n\s*<\/div>/);
    expect(lobby).toMatch(/<div ref=\{columnRef\} className="mx-auto flex min-h-full w-full max-w-\[700px\] flex-col px-4 md:max-w-\[520px\]">/);
  });
});

describe("the chip's label", () => {
  it("is the tabs' 18px", () => {
    expect(lobby).toMatch(/<span className="min-w-0 flex-1 truncate font-display text-\[18px\] font-bold leading-\[26px\] text-\[#402666\]">\s*\n\s*\{label\}/);
    expect(lobby).toMatch(/font-display text-\[18px\] leading-\[26px\] text-\[#402666\]/);
  });
});

describe("switching tabs moves nothing but the tab", () => {
  // Four things conspired to make the page jump on a switch (owner: "when
  // i switch between tabs, page jumps a little"), and each is pinned.
  it("the leaving tab is lifted out of the flow, so the card changes height once", () => {
    expect(lobby).toMatch(/<AnimatePresence mode="popLayout" initial=\{false\}>\s*\n\s*\{tab === "rules" \? \(/);
    expect(lobby).not.toMatch(/<AnimatePresence mode="wait" initial=\{false\}>\s*\n\s*\{tab === "rules"/);
  });

  it("the title block is held at its height from the first switch, so the card grows at its bottom only", () => {
    expect(lobby).toMatch(/const switchTab = \(next: LobbyTab\) => \{\s*\n\s*if \(next === tab\) return;\s*\n\s*if \(titleHeight === null && titleRef\.current\) setTitleHeight\(titleRef\.current\.offsetHeight\);/);
    expect(lobby).toMatch(/className=\{cn\("flex min-h-\[12px\] flex-col items-center pt-\[39px\]", titleHeight === null && "flex-1"\)\}\s*\n\s*style=\{titleHeight === null \? undefined : \{ minHeight: titleHeight \}\}/);
    expect(lobby).toMatch(/onClick=\{\(\) => switchTab\(key\)\}/);
  });

  it("the reader's scroll position is noted before the switch, held by the spacer, and put back", () => {
    expect(lobby).toMatch(/if \(scrollerRef\.current\) keepScrollRef\.current = scrollerRef\.current\.scrollTop;\s*\n\s*setTab\(next\);/);
    // The switch position in full; the live position only up to the
    // spacer's own size (lobbyScrollDoesNotCreep.test.ts).
    expect(lobby).toMatch(/const switching = keepScrollRef\.current \?\? 0;\s*\n\s*const live = Math\.min\(Math\.ceil\(scroller\.scrollTop - natural\), reachRef\.current\);\s*\n\s*return Math\.max\(0, Math\.ceil\(need - natural\), Math\.ceil\(switching - natural\), live\);/);
    expect(lobby).toMatch(/useLayoutEffect\(\(\) => \{\s*\n\s*if \(keepScrollRef\.current === null \|\| !scrollerRef\.current\) return;\s*\n\s*scrollerRef\.current\.scrollTop = keepScrollRef\.current;\s*\n\s*keepScrollRef\.current = null;\s*\n\s*\}, \[reachSpacer\]\);/);
    // The listener also holds the tabs bar (lobbyTabsNeverUnderTheChip.test.ts).
    expect(lobby).toMatch(/scroller\.addEventListener\("scroll", onScroll, \{ passive: true \}\);/);
  });

  it("and the browser's scroll anchoring is off, which scrolled to the top when the leaving tab was removed", () => {
    expect(lobby).toMatch(/overflow-y-auto overflow-x-hidden \[overflow-anchor:none\]"/);
  });
});

