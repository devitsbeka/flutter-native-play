import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The Guess card opens on the quick game's versus screen: Trivia King, the
 * picture game picked for the round, and you.
 *
 * It used to ask "what will you guess?" on a grid, and then, on the level
 * page, show a second screen with the King's face and the pot. The owner
 * wants the versus screen the quick game has (Figma 1147:8835) here too,
 * with two differences: the opponent is Trivia King at once — his face
 * (Figma 1173:11905) and his name, no search animation, no level, no coins —
 * and the plate picks from the picture games only, settling on the one to guess
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
    // Nothing cycling over the avatar, no level line, no coin line on his card.
    const king = screen.slice(screen.indexOf("Trivia King — upper left"), screen.indexOf("The category, in the plate"));
    expect(king.length).toBeGreaterThan(0);
    expect(king).not.toMatch(/common\.level|toLocaleString|searchAvatars|setCurrentAvatar/);
  });

  it("the King's face is the frame's own asset, cropped to its circle", () => {
    const size = statSync(join(process.cwd(), "src/assets/trivia-king.png")).size;
    expect(size).toBeGreaterThan(50_000);
    expect(size).toBeLessThan(600_000);
  });

  it("the plate picks a picture game and settles on one, with three free shuffles", () => {
    expect(screen).toMatch(/setPickIndex\(Math\.floor\(Math\.random\(\) \* categories\.length\)\);/);
    expect(screen).toMatch(/const FREE_SHUFFLES = 3;/);
    expect(screen).toMatch(/canShuffle=\{locked && shufflesLeft > 0 && !busy\}/);
    expect(screen).toMatch(/shuffleLabel=\{t\("playRewards\.newCategory", \{ count: shufflesLeft \}\)\}/);
    // The plate's coin pill is what beating the King pays, never a price.
    expect(screen).toMatch(/reward=\{REWARDS\.GUESS_WIN_REWARD\}/);
    expect(screen).not.toMatch(/GUESS_STAKE|spinCategoryBtn/);
  });

  it("shuffles rather than spins: no reel, nothing that reads as a slot machine", () => {
    // It was a reel — every game a row on one strip, two full turns over
    // 4.4s, landing on the winner. Next to a coin pill that is a slot
    // machine, and App Review rejected 1.0 (74) as simulated gambling. The
    // plate now shows a short "picking" beat and the category settles in.
    const plate = read("src/components/game/VSScreen.tsx");
    expect(plate).toMatch(/export const SHUFFLE_SECONDS = 1\.1;/);
    expect(plate).toMatch(/window\.setTimeout\(\(\) => onLandedRef\.current\?\.\(\), SHUFFLE_SECONDS \* 1000\)/);
    expect(plate).not.toMatch(/REEL_LOOPS|REEL_SECONDS|REEL_EASE|reelRows|REEL_MASK|travel \*/);
    expect(plate).toMatch(/const turning = !!reel && !isLocked && reel\.items\.length > 0;/);
    expect(plate).toMatch(/\+\{reward\.toLocaleString\(\)\}/);
    expect(plate).not.toMatch(/\bstake\b/);
    expect(screen).toMatch(/reel=\{\{ items: plateItems, target: pickIndex, turnKey: shuffleKey, onLanded: landed \}\}/);
    expect(screen).toMatch(/const landed = useCallback\(\(\) => setLocked\(true\), \[\]\);/);
    // The quick game shares the same plate.
    expect(plate).toMatch(/reel=\{\s*reelTarget !== null && !chosenCategory\s*\? \{ items: reelItems, target: reelTarget, turnKey: reelTurn, onLanded: reelLanded \}\s*: undefined\s*\}/);
    expect(plate).toMatch(/reward=\{REWARDS\.GAME_WIN_REWARD\}/);
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
    expect(plate).toMatch(/className="relative flex flex-col justify-center gap-\[6px\] pl-\[76px\] pr-\[72px\] overflow-hidden"/);
    expect(plate).toMatch(/const PLATE_ICON_CLASS = "-left-\[30px\] top-\[16px\] w-\[90px\] h-\[96px\]";/);
  });

  it("the name fits its 223px at one rule, and only the landed icon carries a shadow", () => {
    const plate = read("src/components/game/VSScreen.tsx");
    expect(plate).not.toMatch(/pr-\[72px\] backdrop-blur/);
    expect(plate.match(/drop-shadow\(0 4px 16px/g) ?? []).toHaveLength(1);
    expect(plate).toMatch(/const nameSizeClass = \(name: string\) => \(name\.length > 16 \? "text-\[16px\]" : "text-\[20px\]"\);/);
  });

  it("the picture games wear their card art on the plate, not the library stand-in", () => {
    // guess_logo's icon_slug is a magnifier; its card shows the logo art
    // (CategoryArtwork → POPULAR_CATEGORY_ICONS). The plate makes the same
    // choice (owner: "i still see other icon
    // on guess the logo, we should use what we have in categories").
    const plate = read("src/components/game/VSScreen.tsx");
    expect(screen).toMatch(/iconUrl=\{popularCategoryIcon\(category\?\.category_id\) \?\? undefined\}/);
    expect(screen).toMatch(/iconUrl: popularCategoryIcon\(c\.category_id\) \?\? undefined/);
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
