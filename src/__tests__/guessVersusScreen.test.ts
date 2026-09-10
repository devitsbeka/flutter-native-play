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
    // Two turns over 4.4s on a gentle curve: three turns in 3s, front-loaded
    // (80% of the travel in the first 12% of the time), was a blur again
    // (owner: "we need smooth loader, not too fast").
    expect(plate).toMatch(/export const REEL_LOOPS = 2;/);
    expect(plate).toMatch(/export const REEL_EASE = \[0\.32, 0\.08, 0\.16, 1\] as const;/);
    expect(plate).toMatch(/export const REEL_SECONDS = 4\.4;/);
    expect(plate).toMatch(/const reelTransition = \{ duration: REEL_SECONDS, ease: REEL_EASE \};/);
    expect(plate).toMatch(/animate=\{\{ y: -travel \* NAME_ROW_H \}\}/);
    expect(plate).toMatch(/animate=\{\{ y: -travel \* ICON_ROW_H \}\}/);
    expect(plate).toMatch(/onAnimationComplete=\{reel!\.onLanded\}/);
    expect(screen).toMatch(/reel=\{\{ items: reelItems, target: wheelIndex, turnKey: spinKey, onLanded: landed \}\}/);
    expect(screen).toMatch(/const landed = useCallback\(\(\) => setLocked\(true\), \[\]\);/);
    expect(screen).not.toMatch(/setTimeout|wheelDelay|WHEEL_CYCLES|REEL_SECONDS =/);
    expect(plate).toMatch(/const turning = !!reel && !isLocked && reel\.items\.length > 0;/);
    // The quick game turns the same reel now — its fourteen swaps are gone
    // (owner: "we have same loader on quick game … we need smooth loader").
    expect(plate).not.toMatch(/cycleCategory|categoryIntervalRef|currentCategoryIndex/);
    expect(plate).toMatch(/reel=\{\s*reelTarget !== null && !chosenCategory\s*\? \{ items: reelItems, target: reelTarget, turnKey: reelTurn, onLanded: reelLanded \}\s*: undefined\s*\}/);
    expect(plate).toMatch(/setReelTarget\(pool\.length > 0 \? Math\.floor\(Math\.random\(\) \* pool\.length\) : null\);/);
    // No rules line under the plate any more (owner: "remove description below").
    expect(screen).not.toMatch(/duelRulesHint/);
  });

  it("the plate is tall enough for the art, with clear water before the name", () => {
    // 97 tall with a 84 icon hanging 26 off the edge and the name at 52: the
    // icon's right edge sat ON the name (owner: "increase category loader in
    // height to fit well … enough space between logo and category title").
    const plate = read("src/components/game/VSScreen.tsx");
    expect(plate).toMatch(/const PLATE_H = 128;/);
    expect(plate).toMatch(/const NAME_ROW_H = 36;/);
    expect(plate).toMatch(/const ICON_ROW_H = PLATE_H;/);
    expect(plate).toMatch(/className="relative flex flex-col justify-center gap-\[6px\] pl-\[76px\] pr-\[72px\] overflow-hidden"/);
    expect(plate).toMatch(/const PLATE_ICON_CLASS = "-left-\[30px\] top-\[16px\] w-\[90px\] h-\[96px\]";/);
    expect(plate).toMatch(/className="absolute -left-\[30px\] top-0 w-\[90px\] overflow-hidden pointer-events-none"/);
    expect(plate).toMatch(/className="w-\[90px\] h-\[96px\] object-contain"/);
  });

  it("the strips fade at their ends and carry no filter, so nothing ghosts while they move", () => {
    // WebKit drew the moving strip's column as a flat lighter box over the
    // plate (a backdrop-filter under it, a drop-shadow filter on it), and
    // the rows above and below were cut off mid-glyph (owner: "ghosted dark
    // squares behind the icon and behind the categories … while they
    // rolling they look bad").
    const plate = read("src/components/game/VSScreen.tsx");
    expect(plate).not.toMatch(/pr-\[72px\] backdrop-blur/);
    expect(plate).toMatch(/const REEL_MASK = "linear-gradient\(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%\)";/);
    expect(plate.match(/WebkitMaskImage: REEL_MASK, maskImage: REEL_MASK/g) ?? []).toHaveLength(2);
    // The only drop-shadow left is on the landed icon, which does not move.
    expect(plate.match(/drop-shadow\(0 4px 16px/g) ?? []).toHaveLength(1);
    expect(plate).toMatch(/\{src && <img src=\{src\} alt="" className="w-\[90px\] h-\[96px\] object-contain" \/>\}/);
    // And the name fits its 223px, rolling or landed, at one rule.
    expect(plate).toMatch(/const nameSizeClass = \(name: string\) => \(name\.length > 16 \? "text-\[16px\]" : "text-\[20px\]"\);/);
    expect(plate.match(/nameSizeClass\(/g) ?? []).toHaveLength(2);
  });

  it("the picture games wear their card art on the plate, not the library stand-in", () => {
    // guess_logo's icon_slug is a magnifier; its card shows the logo art
    // (CategoryArtwork → POPULAR_CATEGORY_ICONS). The plate — landed and
    // every reel row — makes the same choice (owner: "i still see other icon
    // on guess the logo, we should use what we have in categories").
    const plate = read("src/components/game/VSScreen.tsx");
    expect(screen).toMatch(/iconUrl=\{popularCategoryIcon\(category\?\.category_id\) \?\? undefined\}/);
    expect(screen).toMatch(/iconUrl: popularCategoryIcon\(c\.category_id\) \?\? undefined/);
    expect(plate).toMatch(/const src = row\.iconUrl \?\? \(row\.iconSlug \? `\$\{ICON_STORAGE_URL\}\/\$\{row\.iconSlug\}\.png` : undefined\);/);
    expect(plate).toMatch(/iconUrl: popularCategoryIcon\(match\?\.category_id\) \?\? undefined,/);
    expect(plate).toMatch(/iconUrl: popularCategoryIcon\(c\.category_id\) \?\? undefined \}/);
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
