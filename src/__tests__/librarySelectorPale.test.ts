/**
 * The Library's category cards are pale, with nothing behind the icon.
 *
 * Owner: "the cards are too dark, and the icons have some dark colour
 * behind them". The dark foot under each card's label is a pale wash over
 * the colour now, with dark type; and the artwork is drawn flat — the two
 * shadows it wore (the wrapper's and the icon's own) had blurred into a
 * dark box behind a small icon.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/team/CategorySelectorModal.tsx");
const art = read("src/components/shared/CategoryArtwork.tsx");
const icon = read("src/components/shared/DynamicIcon.tsx");

describe("the pale card", () => {
  it("wears a white wash over its colour, and dark type on it", () => {
    expect(modal.match(/<div className="absolute inset-0 bg-white\/45" \/>/g) ?? []).toHaveLength(2);
    expect(modal).not.toMatch(/from-black\/70|from-black\/40/);
    expect(modal).toMatch(/text-sm font-semibold text-\[#2b1a4a\] truncate">\s*\n\s*\{category\.name\}/);
    expect(modal).toMatch(/text-sm font-semibold text-\[#2b1a4a\] truncate">\s*\n\s*\{mixedCategoryName\}/);
    expect(modal).not.toMatch(/textShadow/);
  });

  it("and its art is flat", () => {
    expect(modal).toMatch(/size=\{ART_SIZE\}\s*\n\s*flat\s*\n\s*\/>/);
    expect(modal).toMatch(/<DynamicIcon slug="mystery-box" size=\{ART_SIZE\} shadow=\{false\} \/>/);
  });
});

/**
 * Owner, on the pale cards: "icons are lighter, something is covering them;
 * put them in front, same sizes, and move them up so they don't touch the
 * titles". The wash was over the art. Now the art is a layer of its own
 * above the wash, in one fixed box on every card, centred in the band above
 * the label.
 */
describe("the art on the pale card", () => {
  it("is drawn above the wash, not under it", () => {
    // On both cards the wash's div closes before the art layer opens.
    const washThenArt = /bg-white\/45" \/>\s*\n\s*<\/div>[\s\S]*?<div className=\{ART_BAND\}>/g;
    expect(modal.match(washThenArt) ?? []).toHaveLength(2);
    // And the gradient layer no longer holds the artwork.
    expect(modal).not.toMatch(/style=\{\{ background: categoryGradient\(bgColor\) \}\}\s*>\s*<CategoryArtwork/);
  });

  it("sits in one box of one size on every card, clear of the title", () => {
    expect(modal).toMatch(/const ART_SIZE = 60;/);
    expect(modal).toMatch(/const ART_BAND = "absolute inset-x-0 top-0 bottom-12 flex items-center justify-center";/);
    expect(modal).toMatch(/const ART_BOX = "flex size-\[60px\] items-center justify-center";/);
    expect(modal.match(/<div className=\{ART_BAND\}>\s*\n\s*<div className=\{ART_BOX\}>/g) ?? []).toHaveLength(2);
  });
});

describe("flat artwork", () => {
  it("drops both shadows — the wrapper's and the icon's own", () => {
    expect(art).toMatch(/flat\?: boolean;/);
    expect(art).toMatch(/!flat && "drop-shadow-\[0_4px_12px_rgba\(0,0,0,0\.35\)\]"/);
    expect(art).toMatch(/shadow=\{!flat\}/);
    expect(icon).toMatch(/shadow\?: boolean;/);
    expect(icon.match(/style=\{shadow \? \{ filter: "drop-shadow\(0 4px 8px rgba\(0,0,0,0\.2\)\)" \} : undefined\}/g) ?? []).toHaveLength(2);
  });

  it("is off only where asked — every other artwork keeps its shadow", () => {
    expect(art).toMatch(/flat = false/);
    expect(icon).toMatch(/shadow = true,/);
  });
});
