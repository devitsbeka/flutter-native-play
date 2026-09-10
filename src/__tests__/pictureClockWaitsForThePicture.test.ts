import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The clock waits for the picture, and the Guess flow leaves for home.
 *
 * A picture game's clock started on mount and counted down over a picture
 * still downloading, so on a slow phone the first question opened already
 * timed out — the correct answer green, the miss recorded, the opponent a
 * point up — before the player had seen a thing (owner: "guess game
 * started and i see already green answer and this screen"). Both screens
 * that play pictures had it: the category's own level (the Guess card's
 * route) and the quick game against the bot.
 *
 * The card says when its picture is on screen — or has given up and shown
 * the text — and the clock starts on that, keyed by question so moving on
 * un-readies by construction. Every picture of the game is asked for up
 * front, so the later ones open from cache.
 *
 * And a level reached from the Guess card leaves for home, not for the
 * library's level map the player had never been to (owner: "after game
 * ends i still see category page").
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const card = read("src/components/ui/quiz-question-card.tsx");
const level = read("src/pages/CategoryQuizPage.tsx");
const quick = read("src/components/game/QuizGameScreenProd.tsx");

describe("the card says when it can be read", () => {
  it("at once without a picture, and once a picture is on screen or has given up", () => {
    expect(card).toMatch(/onMediaReady\?: \(\) => void;/);
    expect(card).toMatch(/if \(!imageUrl \|\| imageStatus === "loaded" \|\| imageStatus === "error"\) onMediaReadyRef\.current\?\.\(\);/);
    // Through a ref, so a caller's fresh closure never re-fires it.
    expect(card).toMatch(/const onMediaReadyRef = React\.useRef\(onMediaReady\);/);
  });
});

describe("the level page", () => {
  it("starts the clock, and calls time, only once the picture is on screen", () => {
    expect(level).toMatch(/const \[mediaReadyFor, setMediaReadyFor\] = useState\(-1\);/);
    expect(level).toMatch(/const mediaReady = mediaReadyFor === currentQuestionIndex;/);
    expect(level).toMatch(/if \(countdown !== null && countdown > 0\) return;\s*\/\/ Nor before the question's picture is on screen \(mediaReady above\)\.\s*if \(!mediaReady\) return;\s*const timer = setInterval/);
    expect(level).toMatch(/if \(!mediaReady\) return;\s*if \(timeRemaining > 0\) return;\s*handleTimeUp\(\);/);
    expect(level).toMatch(/onMediaReady=\{markMediaReady\}/);
  });

  it("asks for every picture of the level up front", () => {
    expect(level).toMatch(/for \(const q of mapped\) \{\s*if \(q\.image_url\) \{\s*const img = new Image\(\);\s*img\.src = questionImageSrc\(q\.image_url\) \|\| q\.image_url;/);
  });

  it("leaves for home from a Guess-card game, and to the level map otherwise", () => {
    expect(level).toMatch(/const leaveTo = guessStake \? "\/" : `\/category\/\$\{categoryId\}`;/);
    expect(level).not.toMatch(/navigate\(`\/category\/\$\{categoryId\}`\)/);
    expect(level).toMatch(/navigate\(leaveTo\)/);
    // The next level keeps the stake and the 3-2-1 it arrived with.
    expect(level).toMatch(/const nextLevelState = guessStake \? \{ state: \{ countdown: true, guessStake: true \} \} : undefined;/);
    expect(level).toMatch(/navigate\(`\/play\/\$\{categoryId\}\/\$\{unlockedLevel\}`, nextLevelState\)/);
  });
});

describe("the quick game's screen", () => {
  it("starts the clock, and lets the opponent move, only once the picture is on screen", () => {
    expect(quick).toMatch(/if \(phase !== "playing" \|\| answerRevealed \|\| !currentQuestion \|\| !mediaReady\) return;/);
    expect(quick).toMatch(/if \(!opponent \|\| answerRevealed \|\| opponentAnswered \|\| !opponentTurn \|\| !mediaReady\) return;/);
    expect(quick).toMatch(/onMediaReady=\{markMediaReady\}/);
  });

  it("asks for every picture of the match up front", () => {
    expect(quick).toMatch(/for \(const q of questions\) \{\s*if \(q\.imageUrl\) \{\s*const img = new Image\(\);\s*img\.src = questionImageSrc\(q\.imageUrl\) \|\| q\.imageUrl;/);
  });
});
