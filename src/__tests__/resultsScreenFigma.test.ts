/**
 * The results screen, redrawn to Figma 1157:10036 (owner: "show results
 * page like this").
 *
 * What the design fixes, top to bottom:
 *
 *  - The category pill is wide — the artwork at 64px on the left, the
 *    category's name beside it and, under the name, which round of which
 *    game this was. The round label used to float above the pill.
 *  - Every podium face wears the gold ring, first at 110px and the two
 *    beside it at 76, and the medal hangs off the bottom of the ring rather
 *    than stacking under it. The name is 22px display, and under it the
 *    place's coins in a pill of its own metal — gold, silver, bronze —
 *    on a 3px lilac foot.
 *  - From fourth down, each seat is one of the lobby's chunky tiles
 *    (24/24/24/54 corners, a rose wash, an 8px rose foot): the place in
 *    violet on the left, the face in the same gold ring, the name across
 *    the middle, and the coins in a white pill with amber figures.
 *  - The mint New Game and the "Challenge Friend" link under it were
 *    already the design's, and stay.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const results = readFileSync(join(process.cwd(), "src/components/team/GameResultsScreenV2.tsx"), "utf8");

describe("the category pill", () => {
  it("is the wide one, artwork at 64 and the round label under the name", () => {
    expect(results).toMatch(/flex h-\[78px\] w-full max-w-\[294px\] items-center gap-\[25px\] px-5 py-2 rounded-full bg-white\/15 backdrop-blur-sm/);
    expect(results).toMatch(/size=\{64\}\s*\n\s*className="shrink-0 drop-shadow-none"/);
    expect(results).toMatch(/text-\[12px\] font-bold uppercase leading-\[18px\] tracking-\[0\.3px\] text-white\/60/);
  });
});

describe("the standings", () => {
  // The podium's faces and the tiles under them are one list now
  // (resultsAreAList.test.ts). What survives of the design here: the gold
  // ring on the winner, the metals on the coin pills, and the tile the
  // list sits in.
  it("the winner's face is still the one in the gold ring", () => {
    expect(results).toMatch(/const PLACE_RING = \[\s*\n\s*"border-\[#fcd34d\] shadow-\[0_0_0_3px_rgba\(251,191,36,0\.35\)\]",/);
    expect(results).toMatch(/const ring = PLACE_RING\[idx\] \?\? "border-white\/40";/);
  });

  it("each place's coins in its own metal, white from fourth down", () => {
    expect(results).toMatch(/const tone: PotTone = idx === 0 \? "gold" : idx === 1 \? "silver" : idx === 2 \? "bronze" : "white";/);
  });

  it("the score sits under the name now, where a row has room for it", () => {
    // The podium had no room; a row does, and a tie on coins is decided
    // by it.
    expect(results).toMatch(/detail=\{t\("extra\.resultsPoints", \{ n: p\.score \}\)\}/);
  });
});

describe("the coin pills", () => {
  it("come in the design's four metals, each on a lilac foot", () => {
    expect(results).toMatch(/type PotTone = "gold" \| "silver" \| "bronze" \| "white";/);
    expect(results).toMatch(/gold: \{ className: "text-white", style: \{ backgroundImage: "linear-gradient\(-42deg, #ffbb00 37%, #997000 196%\)" \} \}/);
    expect(results).toMatch(/silver: \{ className: "text-white", style: \{ backgroundImage: "linear-gradient\(-47deg, #8b8b8b 7%, #424242 337%, #252525 357%\)" \} \}/);
    expect(results).toMatch(/bronze: \{ className: "bg-\[#9a4312\] text-white" \}/);
    expect(results).toMatch(/white: \{ className: "bg-white text-\[#8c7229\]" \}/);
    expect(results).toMatch(/drop-shadow-\[0px_3px_0px_#a691ec\]/);
    // The amber-or-grey pills, and the greyed coin on a loss, are gone.
    expect(results).not.toMatch(/bg-amber-500\/90/);
    expect(results).not.toMatch(/net < 0 && "grayscale"/);
  });
});

describe("the list's tile", () => {
  it("is the lobby's chunky shape — rose wash, rose foot, 24px corners", () => {
    expect(results).toMatch(/const TILE =\s*\n\s*"rounded-\[24px\] border-2 border-\[rgba\(255,217,217,0\.1\)\] bg-\[rgba\(255,222,222,0\.2\)\] px-3 py-3 shadow-\[0px_2px_8px_0px_rgba\(102,51,153,0\.06\),0px_8px_0px_0px_rgba\(232,185,185,0\.4\)\]";/);
    expect(results).toMatch(/const EYEBROW = "text-\[12px\] font-bold uppercase leading-\[18px\] tracking-\[0\.3px\] text-white\/60";/);
  });

  it("the tiles stand 17px apart in a list that scrolls, not in a card", () => {
    // ...padded by the floating footer's measured height, so the last tile
    // clears the haze (countdownNamesTheRoomAndResultsHaze.test.ts).
    expect(results).toMatch(/className="w-full max-w-\[468px\] flex-1 min-h-0 overflow-y-auto"\s*\n\s*style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
    expect(results).toMatch(/<div className="space-y-\[17px\]">/);
    expect(results).not.toMatch(/max-w-xs bg-white\/10 backdrop-blur-sm rounded-2xl p-3/);
  });
});
