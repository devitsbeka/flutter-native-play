import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VS_PURPLE, VS_SCREEN_PHASES, isVersusPhase } from "@/components/game/VSScreen";

/**
 * The strip under the status bar belongs to the Game page, not to the screen
 * inside it.
 *
 * The page carries the safe-area inset itself (a negative margin and the
 * padding back) and the box holding the screen clips, so a child's own
 * `safe-bleed` is cut off at the padding edge instead of painting up over the
 * bar. Whatever colour the page is wearing is therefore what shows above the
 * header — and it was the quiz ground, #7E7ADB, on every phase. On the versus
 * screen, which is a deeper purple, that read as a pale band across the top.
 *
 * So the page wears the phase's colour, and the list of phases the versus
 * screen is on for lives in one place, because a list that drifts puts the
 * band straight back.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const GAME_PAGE = read("src/pages/Game.tsx");
const CONTAINER = read("src/components/game/GameContainer.tsx");
const VS = read("src/components/game/VSScreen.tsx");
const GUESS_VS = read("src/components/game/GuessVersusScreen.tsx");

const QUIZ_GROUND = "#7E7ADB";

describe("the band under the status bar", () => {
  it("is the versus screen's colour while the versus screen is up", () => {
    expect(GAME_PAGE).toMatch(/background: showsVersusScreen \? VS_PURPLE : "#7E7ADB"/);
    expect(GAME_PAGE).toMatch(/const showsVersusScreen = isVersusPhase\(phase\);/);
  });

  it("is not pinned to the quiz ground for every phase", () => {
    // The class this replaced painted #7E7ADB whatever was on screen.
    expect(GAME_PAGE).not.toMatch(/className="[^"]*bg-\[#7E7ADB\]/);
  });

  it("agrees with what GameContainer actually renders", () => {
    // One list, read by both. Re-listing the phases at either site is how the
    // two drift apart, and the drift is visible as the band.
    expect(CONTAINER).toMatch(/\{isVersusPhase\(phase\) && <VSScreen \/>\}/);
    // Neither site re-lists the phases to decide what the versus screen is
    // for — the page asks isVersusPhase for its colour, the container for its
    // contents. (Game.tsx spells out a list of its own for hasOwnBackground,
    // which is a different question and covers every phase there is.)
    expect(CONTAINER).not.toMatch(/phase === "matchmaking"/);
    expect(GAME_PAGE).not.toMatch(/showsVersusScreen = phase ===/);
    expect(VS_SCREEN_PHASES).toEqual(["home", "matchmaking", "preparing", "vs-screen"]);
    expect(isVersusPhase("vs-screen")).toBe(true);
    expect(isVersusPhase("playing")).toBe(false);
    expect(isVersusPhase("match-result")).toBe(false);
  });

  it("keeps the two colours distinct, so this stays worth doing", () => {
    expect(VS_PURPLE).not.toBe(QUIZ_GROUND);
  });
});

describe("the VS watermark", () => {
  // 180px as drawn, a quarter larger by request. The bleed off the left edge
  // and the drop below centre scale with it or the composition shifts.
  const span =
    /font-slackey text-\[225px\] leading-\[225px\] tracking-\[-11\.25px\] text-white\/\[0\.06\] select-none -translate-x-\[52\.5px\] translate-y-\[25px\]/;

  it("is a quarter larger on the quick game's versus screen", () => {
    expect(VS).toMatch(span);
  });

  it("is the same size on the Guess card's, which shares the design", () => {
    expect(GUESS_VS).toMatch(span);
  });
});
