/**
 * A picture game from the Guess card is one match against Trivia King.
 *
 * It used to be the category's level with a stake bolted on: pass and win
 * 200, fail and lose it, and then the level's own results screen with
 * "next level" and the category's map. The owner's reading of that (owner:
 * "when player choose to play guess game from here ... we shouldn't send
 * player in categories after the game, this play is different, we should
 * handle like one game vs trivia king (our app) and player pays 200 coins
 * and if wins against our mascot named Trivia King and with it's avatar,
 * we should give user + 200, if not - loses 200 coins ... show category
 * what player is going to play, show trivia king mascot and pot"):
 *
 *   before   an intro — the category, the King's face, the 400 pot — and
 *            the 3-2-1 from its Play, not from arrival;
 *   during   the King answers every question the player does, right with a
 *            fixed chance decided by the run and the question, and both
 *            scores are on the screen;
 *   after    the two scores, who took the pot, and two exits: another match
 *            or the guess games. Never the category.
 *
 * The settlement is the one that was already there — settle_guess_game at
 * 200, win / lose / draw, once per run id — fed the match's outcome instead
 * of a pass.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";
import { MASCOT_ACCURACY, duelOutcome, mascotAnswers } from "@/utils/duelOpponent";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const level = read("src/pages/CategoryQuizPage.tsx");
const intro = read("src/components/game/DuelIntro.tsx");
const result = read("src/components/game/DuelResult.tsx");

describe("the King", () => {
  it("answers the same way every time it is asked the same question of the same run", () => {
    for (let i = 0; i < 10; i++) {
      expect(mascotAnswers("run-a", i)).toBe(mascotAnswers("run-a", i));
    }
  });

  it("answers differently between runs and between questions — it is not a constant", () => {
    const runs = Array.from({ length: 200 }, (_, r) => Array.from({ length: 10 }, (_, i) => mascotAnswers(`run-${r}`, i)));
    const distinct = new Set(runs.map((r) => r.join("")));
    expect(distinct.size).toBeGreaterThan(100);
  });

  it("is right about six of ten, not a house edge", () => {
    expect(MASCOT_ACCURACY).toBe(0.6);
    let right = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (mascotAnswers(`sample-${i >> 4}`, i & 15)) right++;
    expect(right / n).toBeGreaterThan(0.57);
    expect(right / n).toBeLessThan(0.63);
    // And the knobs go both ways: nothing at 0, everything at 1.
    for (let i = 0; i < 50; i++) {
      expect(mascotAnswers("x", i, 0)).toBe(false);
      expect(mascotAnswers("x", i, 1)).toBe(true);
    }
  });

  it("loses to more, beats fewer, and a tie moves nothing", () => {
    expect(duelOutcome(7, 6)).toBe("win");
    expect(duelOutcome(5, 6)).toBe("lose");
    expect(duelOutcome(6, 6)).toBe("draw");
    expect(duelOutcome(0, 0)).toBe("draw");
  });
});

describe("before", () => {
  it("opens on the intro, and the countdown waits for its Play", () => {
    expect(level).toMatch(/const \[countdown, setCountdown\] = useState<number \| null>\(wantsCountdown && !duelFromState \? 3 : null\);/);
    expect(level).toMatch(/const \[showDuelIntro, setShowDuelIntro\] = useState\(duelFromState\);/);
    expect(level).toMatch(
      /if \(guessStake && showDuelIntro && !showResults\) \{\s*\n\s*return \(\s*\n\s*<DuelIntro[\s\S]*?onPlay=\{\(\) => \{\s*\n\s*setShowDuelIntro\(false\);\s*\n\s*setCountdown\(3\);\s*\n\s*\}\}\s*\n\s*onBack=\{\(\) => navigate\("\/create-room\?mode=guess"\)\}/,
    );
    // The intro is above the countdown screen, so it is what arrival shows.
    expect(level.indexOf("if (guessStake && showDuelIntro && !showResults)")).toBeLessThan(
      level.indexOf("if (!loading && questions.length > 0 && countdown !== null && countdown > 0)"),
    );
  });

  it("shows the category, the King, and the pot of two stakes; Play waits on the questions", () => {
    expect(intro).toMatch(/<CategoryArtwork categoryId=\{categoryId\} iconSlug=\{iconSlug\} size=\{96\}/);
    expect(intro).toMatch(/\{categoryName\}<\/p>/);
    expect(intro).toMatch(/import crownMascot from "@\/assets\/crown-mascot\.png";/);
    expect(intro).toMatch(/<QuizPlayerAvatar avatarUrl=\{crownMascot\} size="large" state="active" \/>/);
    expect(intro).toMatch(/t\("extra\.duelOpponent"\)/);
    expect(intro).toMatch(/const stake = REWARDS\.GUESS_STAKE;\s*\n\s*const pot = stake \* 2;/);
    expect(REWARDS.GUESS_STAKE * 2).toBe(400);
    expect(intro).toMatch(/t\("lobby\.summaryStake"\)[\s\S]*?\{stake\.toLocaleString\(\)\}/);
    expect(intro).toMatch(/t\("lobby\.winnerTakes"\)[\s\S]*?\{pot\.toLocaleString\(\)\}/);
    expect(intro).toMatch(/onClick=\{onPlay\}\s*\n\s*disabled=\{loading\}/);
    expect(level).toMatch(/loading=\{loading \|\| questions\.length === 0\}/);
    // A page of its own on iOS: a fixed box that scrolls itself.
    expect(intro).toMatch(/h-\[calc\(100dvh_-_var\(--safe-top\)_-_var\(--safe-bottom\)\)\] overflow-y-auto/);
    expect(result).toMatch(/h-\[calc\(100dvh_-_var\(--safe-top\)_-_var\(--safe-bottom\)\)\] overflow-y-auto/);
  });
});

describe("during", () => {
  it("the King answers on both of the player's paths — an answer and a timeout", () => {
    const turns = level.match(/if \(guessStake && mascotAnswers\(guessRunId\.current, currentQuestionIndex\)\) \{\s*\n\s*setMascotScore\(\(prev\) => prev \+ 1\);\s*\n\s*\}/g) ?? [];
    expect(turns).toHaveLength(2);
    const timeUp = level.indexOf("const handleTimeUp = useCallback(");
    const select = level.indexOf("const handleAnswerSelect = ");
    expect(timeUp).toBeGreaterThan(0);
    expect(select).toBeGreaterThan(timeUp);
    expect(level.indexOf("mascotAnswers(guessRunId.current", timeUp)).toBeLessThan(select);
    expect(level.indexOf("mascotAnswers(guessRunId.current", select)).toBeGreaterThan(select);
  });

  it("both scores are on the board, only in a duel", () => {
    expect(level).toMatch(
      /\{guessStake && \(\s*\n\s*<div[^>]*>\s*\n\s*<QuizPlayerAvatar avatarUrl=\{profile\?\.avatar_url \?\? null\} score=\{score\} position="left"[^\n]*\n\s*<span[^>]*>VS<\/span>\s*\n\s*<QuizPlayerAvatar avatarUrl=\{crownMascot\} score=\{mascotScore\} position="right"/,
    );
  });
});

describe("after", () => {
  it("settles by the match's outcome, under the run's id", () => {
    expect(level).toMatch(/settleGuessGame\(duelOutcome\(score, mascotScore\), guessRunId\.current\)/);
    expect(level).not.toMatch(/settleGuessGame\(result\.stars/);
  });

  it("shows the duel's own result, whose exits are a rematch or the guess games — never the category", () => {
    const branch = level.slice(level.indexOf("if (showResults && guessStake) {"), level.indexOf("if (showResults) {"));
    expect(branch.length).toBeGreaterThan(0);
    expect(branch).toMatch(/<DuelResult\s*\n\s*outcome=\{duelOutcome\(score, mascotScore\)\}/);
    expect(branch).toMatch(/onPlayAgain=\{resetQuiz\}/);
    expect(branch).toMatch(/onBack=\{\(\) => navigate\("\/create-room\?mode=guess"\)\}/);
    expect(branch).not.toMatch(/\/category\//);
    expect(result).not.toMatch(/\/category\//);
    expect(result).not.toMatch(/nextLevel|NextLevel/);
    // The delta pill: only what actually moved, once settled.
    expect(result).toMatch(/\{!saving && delta !== null && delta !== 0 && \(/);
    expect(result).toMatch(/const title = outcome === "win" \? t\("extra\.duelWin"\) : outcome === "lose" \? t\("extra\.duelLose"\) : t\("extra\.duelDraw"\);/);
  });

  it("a rematch is a new run, from nil", () => {
    expect(level).toMatch(/guessRunId\.current = mintRunId\(\);\s*\n\s*setMascotScore\(0\);\s*\n\s*setGuessDelta\(null\);/);
  });
});

describe("the words", () => {
  it("are in all seven", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["duelTitle", "duelOpponent", "duelWin", "duelLose", "duelDraw", "duelBackToGuess", "duelIntroHint"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
    // The King keeps his name.
    expect(read("src/locales/en.ts")).toMatch(/duelOpponent: "Trivia King",/);
  });
});
