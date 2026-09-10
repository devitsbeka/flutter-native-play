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
    // The same three positions the quick game puts its blocks at.
    expect(screen).toMatch(/top-\[25\.1%\]/);
    expect(screen).toMatch(/top-\[45\.6%\]/);
    expect(screen).toMatch(/top-\[68\.3%\]/);
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
    expect(screen).toMatch(/const WHEEL_CYCLES = 12;/);
    expect(screen).toMatch(/const FREE_SPINS = 3;/);
    expect(screen).toMatch(/canSpin=\{locked && spinsLeft > 0 && !busy\}/);
    expect(screen).toMatch(/stake=\{REWARDS\.GUESS_STAKE\}/);
  });

  it("turns like a wheel — one game to the next, slowing to a stop — and the plate glides with it", () => {
    // It used to jump to a random game every 60ms, a flicker rather than a
    // spin (owner: "it rolls very fast, we need more smooth animation").
    expect(screen).toMatch(/setWheelIndex\(\(i\) => \(i \+ 1\) % categories\.length\);/);
    expect(screen).toMatch(/const WHEEL_FIRST_MS = 110;/);
    expect(screen).toMatch(/const WHEEL_LAST_MS = 520;/);
    expect(screen).toMatch(/return Math\.round\(WHEEL_FIRST_MS \+ \(WHEEL_LAST_MS - WHEEL_FIRST_MS\) \* t \* t\);/);
    expect(screen).not.toMatch(/return 60;/);
    // Each swap on the plate gets a share of the step it has to fit in.
    expect(screen).toMatch(/rollDuration=\{rollDurationFor\(stepMs\)\}/);
    expect(read("src/components/game/VSScreen.tsx")).toMatch(/duration: isLocked \? 0\.22 : rollDuration/);
    expect(read("src/components/game/VSScreen.tsx")).toMatch(/duration: isLocked \? 0\.34 : rollDuration/);
    // And the one line that says how it is scored, once the wheel has stopped.
    expect(screen).toMatch(/\{t\("extra\.duelRulesHint"\)\}/);
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
