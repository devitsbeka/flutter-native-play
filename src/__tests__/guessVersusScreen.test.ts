import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The Guess card opens on the quick game's versus screen: Trivia King, the
 * wheel of picture games, and you.
 *
 * It used to ask "what will you guess?" on a grid, and then, on the level
 * page, show a second screen with the King's face and the pot. The owner
 * wants the versus screen the quick game has (Figma 1147:8835) here too,
 * with two differences: the opponent is Trivia King at once — his face
 * (Figma 1173:11905) and his name, no slot machine, no level, no coins —
 * and the wheel spins the picture games only, landing on the one to guess
 * (owner: "show this screen (quick game screen) on guess game screen too,
 * show this avatar for Trivia King avatar instantly and instead choosing
 * what to guess show this randomizer ... trivia king has no levels or
 * coins just trivia king with this avatar").
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const screen = read("src/components/game/GuessVersusScreen.tsx");
const vs = read("src/components/game/VSScreen.tsx");
const create = read("src/components/team/CreateRoomPage.tsx");
const level = read("src/pages/CategoryQuizPage.tsx");

describe("the screen is the quick game's", () => {
  it("borrows the plate and the frame colour rather than redrawing them", () => {
    expect(vs).toMatch(/export const VS_PURPLE = "#5651CE";/);
    expect(vs).toMatch(/export function CategoryPlate\(/);
    expect(screen).toMatch(/import \{ CategoryPlate, VS_PURPLE \} from "@\/components\/game\/VSScreen";/);
    expect(screen).toMatch(/style=\{\{ background: VS_PURPLE \}\}/);
    // The plate where the quick game puts it; the two cards pushed apart
    // from the quick game's 25.1% / 68.3%, so the plate and its rules line
    // have room between them (owner: "move mascot avatar and players
    // avatar little up and down to free space between").
    expect(screen).toMatch(/top-\[18%\]/);
    expect(screen).toMatch(/top-\[45\.6%\]/);
    expect(screen).toMatch(/top-\[74%\]/);
    // And the same inset from either edge (owner: "check padding from
    // left and right") — one constant, on both cards.
    expect(screen).toMatch(/const CARD_INSET = "px-\[4%\]";/);
    expect((screen.match(/\$\{CARD_INSET\}/g) ?? []).length).toBe(2);
    expect(screen).not.toMatch(/pl-\[7%\]/);
  });

  it("Trivia King is there at once, face and name, nothing under it", () => {
    expect(screen).toMatch(/<SmartAvatar avatarUrl=\{triviaKingAvatar\} fallback="K" size="2xl"/);
    expect(screen).toMatch(/\{t\("extra\.duelOpponent"\)\}/);
    // No wheel over the avatar, no level line, no coin line on his card.
    const king = screen.slice(screen.indexOf("Trivia King — upper left"), screen.indexOf("The wheel, in the plate"));
    expect(king).not.toMatch(/common\.level|toLocaleString|slotAvatars|setCurrentAvatar/);
  });

  it("the King's face is the frame's own asset, cropped to its circle", () => {
    const size = statSync(join(process.cwd(), "src/assets/trivia-king.png")).size;
    expect(size).toBeGreaterThan(50_000);
    expect(size).toBeLessThan(600_000);
  });

  it("the wheel spins the picture games and lands on one, with three re-rolls", () => {
    expect(screen).toMatch(/setWheelIndex\(Math\.floor\(Math\.random\(\) \* categories\.length\)\);/);
    expect(screen).toMatch(/const FREE_SPINS = 3;/);
    expect(screen).toMatch(/canSpin=\{locked && spinsLeft > 0 && !busy\}/);
    expect(screen).toMatch(/stake=\{REWARDS\.GUESS_STAKE\}/);
  });

  it("is a reel: one continuous motion that lands, not timed swaps", () => {
    // Twelve swaps at 60ms, then twelve on an ease-out curve — both read as
    // a flicker (owner, twice: "it rolls very fast, we need smooth
    // animation"). Now every game is a row on one strip that travels three
    // full turns and lands in one ease-out motion; nothing is swapped.
    const plate = read("src/components/game/VSScreen.tsx");
    expect(plate).toMatch(/export const REEL_LOOPS = 3;/);
    expect(plate).toMatch(/export const REEL_EASE = \[0\.12, 0\.8, 0\.18, 1\] as const;/);
    expect(plate).toMatch(/animate=\{\{ y: -travel \* NAME_ROW_H \}\}/);
    expect(plate).toMatch(/animate=\{\{ y: -travel \* ICON_ROW_H \}\}/);
    expect(plate).toMatch(/onAnimationComplete=\{reel!\.onLanded\}/);
    expect(screen).toMatch(/const REEL_SECONDS = 3;/);
    expect(screen).toMatch(/reel=\{\{ items: categories, target: wheelIndex, turnKey: spinKey, seconds: REEL_SECONDS, onLanded: landed \}\}/);
    expect(screen).toMatch(/const landed = useCallback\(\(\) => setLocked\(true\), \[\]\);/);
    expect(screen).not.toMatch(/setTimeout|wheelDelay|WHEEL_CYCLES/);
    // The quick game's wheel keeps its swaps: the reel is opt-in.
    expect(plate).toMatch(/const turning = !!reel && !isLocked && reel\.items\.length > 0;/);
    // And the one line that says how it is scored, once the wheel has
    // stopped — narrow, so it never runs into the cards (owner: "show text
    // below in more narrow container").
    expect(screen).toMatch(/\{t\("extra\.duelRulesHint"\)\}/);
    expect(screen).toMatch(/className="mx-auto mt-3 max-w-\[260px\] text-center/);
  });

  it("Play hands the landed game to the caller", () => {
    expect(screen).toMatch(/onClick=\{\(\) => category && onPlay\(category\)\}/);
    expect(screen).toMatch(/disabled=\{!ready\}/);
  });
});

describe("where it stands", () => {
  it("over the create page, in the picker's place, fed the picture games", () => {
    expect(create).toMatch(/<GuessVersusScreen\s*\n\s*categories=\{guessCategories\}\s*\n\s*onPlay=\{pickGuessCategory\}\s*\n\s*onBack=\{\(\) => setGameChoice\(null\)\}\s*\n\s*busy=\{isCreating\}/);
    expect(create).not.toMatch(/GuessPickerScreen/);
  });

  it("sends the level page straight to its 3-2-1 — the intro would only repeat it", () => {
    expect(create).toMatch(/state: \{ countdown: true, guessStake: true, versus: true \}/);
    expect(level).toMatch(/const versusShown = Boolean\(\(location\.state as \{ versus\?: boolean \} \| null\)\?\.versus\);/);
    expect(level).toMatch(/useState\(duelFromState && !versusShown\)/);
    expect(level).toMatch(/wantsCountdown && \(!duelFromState \|\| versusShown\) \? 3 : null/);
  });
});
