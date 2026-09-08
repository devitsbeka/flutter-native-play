/**
 * The lobby's chrome, redrawn to Figma 1123:8843.
 *
 * Every lobby in the app is the same UniversalLobby — a room, the arena,
 * the King's couch, the room being created — so this is one change in one
 * file rather than four that can drift apart.
 *
 * What the design moved:
 *
 *  - The category row was TWO boxes: a wide pill and, floating beside it,
 *    a second 63px slab holding the +, with its own border and its own
 *    foot. The row read as two controls that happened to be adjacent. The
 *    design draws ONE pill with the icon at its left, the name across it
 *    and the + inside its right end — in the lilac the rest of the screen
 *    is in, where the old rose was the only warm note up there.
 *
 *  - The tab bar was a hairline box with the open tab filled solid #402666
 *    and its label knocked out white, so the CLOSED tab read as text
 *    switched off rather than as somewhere to go. It is a white bar on a
 *    chunky lilac foot now, the open tab a bordered pane inside it, and
 *    both labels the same colour — weight is what says which one is open.
 *
 * The Start button is deliberately unchanged: the design keeps it violet.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lobby = readFileSync(join(process.cwd(), "src/components/lobby/UniversalLobby.tsx"), "utf8");

describe("the category chip", () => {
  it("is one pill, in the design's lilac on a lilac foot", () => {
    expect(lobby).toMatch(
      /border-2 border-solid border-white bg-\[#fcf7fd\] shadow-\[0px_2px_8px_0px_rgba\(51,51,51,0\.06\),0px_8px_0px_0px_#bea5d4\]/,
    );
    // The rose slab and its rose foot are what this replaced.
    expect(lobby).not.toMatch(/bg-\[#faebef\]/);
    expect(lobby).not.toMatch(/#bf909b/);
  });

  it("keeps the asymmetric corner the whole play flow is cut to", () => {
    expect(lobby).toMatch(
      /rounded-bl-\[24px\] rounded-br-\[54px\] rounded-tl-\[24px\] rounded-tr-\[24px\]/,
    );
  });

  it("carries the + inside itself rather than beside itself", () => {
    // One pill: the + is handed to the Chip, not drawn as a sibling box.
    expect(lobby).toMatch(/action=\{\s*\n\s*category\.onAdd && \(/);
    expect(lobby).toMatch(/action\?: ReactNode;/);
    expect(lobby).toMatch(/\{action\}/);
    // The + no longer has a slab of its own to stand on.
    expect(lobby).not.toMatch(/flex h-\[63px\] w-\[63px\] shrink-0 items-center justify-center rounded-bl/);
  });

  it("presses as one, whichever half is touched", () => {
    // :active matches on an ancestor while a descendant is pressed, so the
    // foot is taken by the pill and not by the half that was tapped.
    expect(lobby).toMatch(
      /active:translate-y-\[4px\] active:shadow-\[0px_4px_0px_0px_#bea5d4\]/,
    );
  });

  it("and the + still closes the round list it opened", () => {
    expect(lobby).toMatch(/onClick=\{categoryMenu\?\.open \? categoryMenu\.onClose : category\.onAdd\}/);
  });
});

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
    expect(lobby).not.toMatch(/bg-\[#402666\] shadow-\[inset_0px_2px_4px/);
    expect(lobby).not.toMatch(/active \? "text-white" : "text-\[#402666\]"/);
  });

  it("says which tab is open with weight, both labels the same colour", () => {
    expect(lobby).toMatch(/active \? "font-bold" : "font-normal"/);
  });

  it("sets the labels in the design's 18px display face", () => {
    expect(lobby).toMatch(/font-display text-\[18px\] leading-\[26px\] text-\[#402666\]/);
  });

  it("carries no + of its own — the design puts that on the category pill", () => {
    expect(lobby).not.toMatch(/const withInvite =/);
    expect(lobby).not.toMatch(/aria-label=\{labels\.invite\}/);
  });

  it("keeps the pill's own animation across the move", () => {
    expect(lobby).toMatch(/layoutId="lobby-tab-pill"/);
  });
});

describe("the Start button stays violet", () => {
  it("wears the gradient and the foot the design keeps for it", () => {
    expect(lobby).toMatch(
      /bg-\[linear-gradient\(180deg,#a374e9_0%,#cf5eff_58%,#9f5dff_100%\)\]/,
    );
    expect(lobby).toMatch(/shadow-\[0px_4px_0px_0px_#6906cd,0px_8px_16px_0px_rgba\(102,51,153,0\.3\)\]/);
    expect(lobby).toMatch(/rounded-\[28px\] border-\[1\.5px\] border-solid border-\[#402666\]/);
    // The sunset was drawn from a variant the design has since replaced.
    expect(lobby).not.toMatch(/#b54682|#663951|175\.73deg/);
  });

  it("shows only the glyph its caller brought, and no arrow of its own", () => {
    expect(lobby).toMatch(
      /\{start\.loading \? <Loader2 className="h-5 w-5 animate-spin" \/> : start\.icon\}/,
    );
    expect(lobby).not.toMatch(/<Play /);
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
