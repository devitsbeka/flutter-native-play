/**
 * The lobby's two tabs and its one button, redrawn to Figma 1123:9994.
 *
 * Every lobby in the app — a room, the arena, the King's couch, the room
 * being created — is the same UniversalLobby, so both of these are one
 * change in one file rather than four that can drift apart.
 *
 * What the design moved:
 *
 *  - The tab bar was a hairline box with the open tab filled solid #402666
 *    and its label knocked out white. The closed tab therefore read as text
 *    switched OFF rather than as somewhere to go. It is a white bar on a
 *    chunky lilac foot now, the open tab a bordered pane inside it, and
 *    both labels the same colour — weight is what says which one is open.
 *
 *  - The Players tab carries a + while it is the open one: the control that
 *    adds a person, on the tab that shows the people.
 *
 *  - Start was violet, which is the colour of the panes it sits on. It is a
 *    sunset now — plum through pink and coral into orange — and the only
 *    warm thing on the screen, with the play triangle the design puts before
 *    the words.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lobby = readFileSync(join(process.cwd(), "src/components/lobby/UniversalLobby.tsx"), "utf8");

describe("the tab bar", () => {
  it("is a white bar standing on a chunky lilac foot", () => {
    expect(lobby).toMatch(
      /rounded-\[28px\] border border-\[#ceb8e4\] bg-\[rgba\(255,255,255,0\.77\)\] p-\[10px\] shadow-\[0px_8px_0px_0px_#d0bbe3\]/,
    );
  });

  it("draws the open tab as a bordered pane, not a filled slab", () => {
    expect(lobby).toMatch(
      /rounded-\[14px\] border border-\[#d1a7dc\] bg-\[rgba\(240,218,245,0\.22\)\]/,
    );
    // The knocked-out white label on solid violet is what this replaced.
    expect(lobby).not.toMatch(/bg-\[#402666\] shadow-\[inset_0px_2px_4px/);
    expect(lobby).not.toMatch(/active \? "text-white" : "text-\[#402666\]"/);
  });

  it("says which tab is open with weight, both labels the same colour", () => {
    expect(lobby).toMatch(/active \? "font-bold" : "font-medium"/);
  });

  it("keeps the pill's own animation across the move", () => {
    expect(lobby).toMatch(/layoutId="lobby-tab-pill"/);
  });
});

describe("the + on the Players tab", () => {
  it("rides the Players tab only while it is the open one", () => {
    expect(lobby).toMatch(
      /const withInvite =\s*\n\s*key === "players"\s*\n\s*&& active\s*\n\s*&& !!onInvite/,
    );
  });

  it("goes when the room is full, on the same test the Invite row uses", () => {
    // Twice in the negative: once for this +, once for the Invite row
    // inside the tab. (The positive form is a third thing — the "room is
    // full" line that stands where the row would have been.)
    expect(
      (lobby.match(/!\(capacity && capacity\.taken >= capacity\.max\)/g) ?? []).length,
    ).toBe(2);
  });

  it("leaves the label room, so a longer word cannot slide under the glyph", () => {
    expect(lobby).toMatch(/withInvite && "pr-\[52px\]"/);
    expect(lobby).toMatch(/absolute right-\[10px\] top-1\/2 flex size-\[40px\]/);
  });

  it("opens the same invite sheet the row below it does", () => {
    expect(lobby).toMatch(/onClick=\{onInvite\}\s*\n\s*aria-label=\{labels\.invite\}/);
  });
});

describe("the Start button", () => {
  it("is the sunset, not the violet it shared with every pane behind it", () => {
    expect(lobby).toMatch(
      /bg-\[linear-gradient\(175\.73deg,#6c3271_11\.562%,#ff5993_34\.068%,rgba\(255,118,98,0\.65\)_61\.925%,#ff9120_126\.14%\)\]/,
    );
    expect(lobby).toMatch(/border-\[#b54682\]/);
    expect(lobby).toMatch(/rounded-\[18\.39px\]/);
    expect(lobby).not.toMatch(/#cf5eff|#a374e9|#6906cd/);
  });

  it("stands on its own foot and presses onto it", () => {
    expect(lobby).toMatch(/shadow-\[0px_4px_0px_0px_#663951,0px_8px_16px_0px_#b44582\]/);
    expect(lobby).toMatch(
      /active:translate-y-\[2px\] active:shadow-\[0px_2px_0px_0px_#663951,0px_8px_16px_0px_#b44582\]/,
    );
    // The white hairline inside the top edge survives the recolour.
    expect(lobby).toMatch(/shadow-\[inset_0px_2px_0px_0px_rgba\(255,255,255,0\.45\)\]/);
  });

  it("takes the play triangle only when the caller brought no glyph of its own", () => {
    // A host picking a category brings a Plus, a guest pinging brings a
    // bell; neither should be overwritten by an arrow that means Start.
    expect(lobby).toMatch(
      /start\.icon \?\? <Play className="h-5 w-5 fill-current" strokeWidth=\{0\} \/>/,
    );
  });
});

describe("the line above the button", () => {
  it("is the design's 16px Nunito, at full strength", () => {
    expect(lobby).toMatch(
      /text-center font-\[Nunito\] text-\[16px\] font-medium leading-\[19\.5px\] tracking-\[-0\.16px\] text-\[#402666\]"\s*>\s*\n\s*\{start\.caption\}/,
    );
  });

  it("and still sits above a disabled Start, where the reason cannot be scrolled off", () => {
    expect(lobby).toMatch(/\{start\.disabled && captionBlock\}/);
  });
});
