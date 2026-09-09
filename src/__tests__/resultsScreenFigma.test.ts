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

describe("the podium", () => {
  it("every face in the gold ring, 110 in the middle and 76 beside", () => {
    expect(results).toMatch(/"border-2 border-\[#fcd34d\] shadow-\[0_0_0_4px_rgba\(251,191,36,0\.35\)\]",\s*\n\s*first \? "w-\[110px\] h-\[110px\]" : "w-\[76px\] h-\[76px\]"/);
  });

  it("the medal hangs off the ring, and the wrapper keeps room for it", () => {
    expect(results).toMatch(/"absolute left-1\/2 -translate-x-1\/2 leading-none",\s*\n\s*first \? "-bottom-\[23px\] text-\[46px\]" : "-bottom-\[16px\] text-\[32px\]"/);
    expect(results).toMatch(/first \? "mb-\[26px\]" : "mb-\[20px\]"/);
  });

  it("the name at 22px display, then the place's coins in its own metal", () => {
    expect(results).toMatch(/w-full text-center font-display text-\[22px\] font-bold leading-6 tracking-\[-0\.16px\] text-white truncate/);
    expect(results).toMatch(/<PotLine net=\{netFor\(p\)\} tone=\{idx === 0 \? "gold" : idx === 1 \? "silver" : "bronze"\} \/>/);
  });

  it("no score under the name — the design carries the coins alone", () => {
    expect(results).not.toMatch(/text-white\/70 text-xs font-semibold">\{p\.score\}/);
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

describe("fourth down", () => {
  it("each seat is a chunky tile: place, ringed face, name, white coins", () => {
    expect(results).toMatch(/flex h-\[71px\] items-center gap-3 rounded-tl-\[24px\] rounded-tr-\[24px\] rounded-bl-\[24px\] rounded-br-\[54px\] border-2 border-\[rgba\(255,217,217,0\.1\)\] pl-3 pr-5 shadow-\[0px_2px_8px_0px_rgba\(102,51,153,0\.06\),0px_8px_0px_0px_rgba\(232,185,185,0\.4\)\]/);
    expect(results).toMatch(/p\.isMe \? "bg-\[rgba\(255,222,222,0\.32\)\]" : "bg-\[rgba\(255,222,222,0\.2\)\]"/);
    expect(results).toMatch(/w-\[44px\] shrink-0 text-center font-display text-\[20px\] font-bold uppercase text-\[#6350c9\]/);
    expect(results).toMatch(/className="w-\[50px\] h-\[50px\] border-2 border-\[#fcd34d\] shadow-\[0_0_0_4px_rgba\(251,191,36,0\.35\)\]"/);
    expect(results).toMatch(/<PotLine net=\{netFor\(p\)\} tone="white" \/>/);
  });

  it("the tiles stand 17px apart in a list that scrolls, not in a card", () => {
    expect(results).toMatch(/className="w-full max-w-\[468px\] flex-1 min-h-0 overflow-y-auto pb-3"/);
    expect(results).toMatch(/<div className="space-y-\[17px\]">/);
    expect(results).not.toMatch(/max-w-xs bg-white\/10 backdrop-blur-sm rounded-2xl p-3/);
  });
});
