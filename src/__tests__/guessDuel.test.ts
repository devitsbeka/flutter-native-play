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
 *   during   the King knows every answer and takes 90 a question; the
 *            player scores by the clock — 100 inside five seconds, less
 *            after, nothing for a miss — and both are on the screen
 *            (owner: "if user answers correctly in 5 seconds point is theirs
 *            but if they answer correctly after 5 seconds point gets trivia
 *            king ... Trivia king knows all the answers, never gets 1000
 *            points but it is hard to beat Trivia King but if user knows
 *            all answers and answers in 5 seconds user should win");
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
import {
  FAST_ANSWER_SECONDS,
  KING_POINTS,
  QUESTION_POINTS,
  SLOW_ANSWER_FLOOR,
  answerPoints,
  duelOutcome,
} from "@/utils/duelOpponent";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const level = read("src/pages/CategoryQuizPage.tsx");
const intro = read("src/components/game/DuelIntro.tsx");
const result = read("src/components/game/DuelResult.tsx");

describe("the King", () => {
  it("knows every answer, and scores 90 for each: 900 over ten, never 1000", () => {
    expect(KING_POINTS).toBe(90);
    expect(KING_POINTS * 10).toBe(900);
    expect(KING_POINTS).toBeLessThan(QUESTION_POINTS);
  });

  it("a fast right answer is 100 — the question is the player's", () => {
    for (let s = 0; s <= FAST_ANSWER_SECONDS; s++) expect(answerPoints(true, s)).toBe(100);
    expect(answerPoints(true, 4.6)).toBe(100);
    expect(QUESTION_POINTS).toBeGreaterThan(KING_POINTS);
  });

  it("a slow right answer starts at 80 and falls to 40 — the question is the King's", () => {
    expect(answerPoints(true, 6)).toBe(80);
    expect(answerPoints(true, 7)).toBe(70);
    expect(answerPoints(true, 8)).toBe(60);
    expect(answerPoints(true, 9)).toBe(50);
    expect(answerPoints(true, 10)).toBe(40);
    expect(answerPoints(true, 15)).toBe(SLOW_ANSWER_FLOOR);
    for (let s = 6; s <= 15; s++) expect(answerPoints(true, s)).toBeLessThan(KING_POINTS);
  });

  it("a wrong answer, or none, is nothing", () => {
    expect(answerPoints(false, 1)).toBe(0);
    expect(answerPoints(false, 15)).toBe(0);
  });

  it("ten fast answers beat him; nine and a miss draw; nine fast and one slow still win; guessing loses", () => {
    expect(duelOutcome(10 * 100, 10 * KING_POINTS)).toBe("win");
    expect(duelOutcome(9 * 100, 10 * KING_POINTS)).toBe("draw");
    expect(duelOutcome(9 * 100 + answerPoints(true, 6), 10 * KING_POINTS)).toBe("win");
    expect(duelOutcome(5 * 100, 10 * KING_POINTS)).toBe("lose");
    expect(duelOutcome(0, 0)).toBe("draw");
  });
});

describe("before", () => {
  it("opens on the intro, and the countdown waits for its Play", () => {
    // A level the Guess card's versus screen sent here (state.versus) has
    // seen the King, the game and the stake already: no second intro, and
    // the 3-2-1 from arrival (guessVersusScreen.test.ts).
    expect(level).toMatch(/const \[countdown, setCountdown\] = useState<number \| null>\(wantsCountdown && \(!duelFromState \|\| versusShown\) \? 3 : null\);/);
    expect(level).toMatch(/const \[showDuelIntro, setShowDuelIntro\] = useState\(duelFromState && !versusShown\);/);
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
    // His face is the one the versus screen wears (owner: "show this
    // avatar for Trivia King avatar ... on game play screen too").
    expect(intro).toMatch(/import triviaKingAvatar from "@\/assets\/trivia-king\.png";/);
    expect(intro).toMatch(/<QuizPlayerAvatar avatarUrl=\{triviaKingAvatar\} size="large" state="active" \/>/);
    expect(result).toMatch(/import triviaKingAvatar from "@\/assets\/trivia-king\.png";/);
    expect(result).toMatch(/<QuizPlayerAvatar avatarUrl=\{triviaKingAvatar\} size="large" score=\{mascotScore\}/);
    for (const src of [intro, result, level]) expect(src).not.toMatch(/crown-mascot/);
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
  it("the King takes his 90 on both of the player's paths — an answer and a timeout", () => {
    const turns = level.match(/setMascotScore\(\(prev\) => prev \+ KING_POINTS\);/g) ?? [];
    expect(turns).toHaveLength(2);
    const timeUp = level.indexOf("const handleTimeUp = useCallback(");
    const select = level.indexOf("const handleAnswerSelect = ");
    expect(timeUp).toBeGreaterThan(0);
    expect(select).toBeGreaterThan(timeUp);
    expect(level.indexOf("prev + KING_POINTS", timeUp)).toBeLessThan(select);
    expect(level.indexOf("prev + KING_POINTS", select)).toBeGreaterThan(select);
    expect(level).not.toMatch(/mascotAnswers/);
  });

  it("the player's points are the clock's, and the clock is the one on screen", () => {
    expect(level).toMatch(/setDuelPoints\(\(prev\) => prev \+ answerPoints\(isCorrect, elapsedSeconds\.current\)\);/);
    // Ticks with the visible clock — after the picture, not during a freeze —
    // and resets with the question.
    expect(level).toMatch(/setTimeRemaining\(\(prev\) => \(prev <= 1 \? 0 : prev - 1\)\);\s*\n\s*elapsedSeconds\.current \+= 1;/);
    expect(level).toMatch(/useEffect\(\(\) => \{\s*\n\s*elapsedSeconds\.current = 0;\s*\n\s*\}, \[currentQuestionIndex\]\);/);
    // Right answers are still counted for the level's own stars.
    expect(level).toMatch(/if \(isCorrect\) \{\s*\n\s*setScore\(\(prev\) => prev \+ 1\);\s*\n\s*\}/);
  });

  it("both scores are on the board, only in a duel", () => {
    expect(level).toMatch(
      /\{guessStake && \(\s*\n\s*<div[^>]*>\s*\n\s*<QuizPlayerAvatar avatarUrl=\{profile\?\.avatar_url \?\? null\} score=\{duelPoints\} position="left"[^\n]*\n\s*<span[^>]*>VS<\/span>\s*\n\s*<QuizPlayerAvatar avatarUrl=\{triviaKingAvatar\} score=\{mascotScore\} position="right"/,
    );
  });
});

describe("after", () => {
  it("settles by the match's outcome — points, not the count — under the run's id", () => {
    expect(level).toMatch(/settleGuessGame\(duelOutcome\(duelPoints, mascotScore\), guessRunId\.current\)/);
    expect(level).not.toMatch(/duelOutcome\(score,/);
    expect(level).not.toMatch(/settleGuessGame\(result\.stars/);
  });

  it("shows the duel's own result, whose exits are a rematch or the guess games — never the category", () => {
    const branch = level.slice(level.indexOf("if (showResults && guessStake) {"), level.indexOf("if (showResults) {"));
    expect(branch.length).toBeGreaterThan(0);
    expect(branch).toMatch(/<DuelResult\s*\n\s*outcome=\{duelOutcome\(duelPoints, mascotScore\)\}\s*\n\s*score=\{duelPoints\}\s*\n\s*mascotScore=\{mascotScore\}\s*\n\s*correct=\{score\}/);
    expect(result).toMatch(/t\("extra\.quizCorrectAnswers", \{ score: correct, total \}\)/);
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
    expect(level).toMatch(/guessRunId\.current = mintRunId\(\);\s*\n\s*setMascotScore\(0\);\s*\n\s*setGuessDelta\(null\);\s*\n\s*setDuelPoints\(0\);\s*\n\s*elapsedSeconds\.current = 0;/);
  });
});

describe("the words", () => {
  it("are in all seven", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["duelTitle", "duelOpponent", "duelWin", "duelLose", "duelDraw", "duelBackToGuess", "duelIntroHint", "duelRulesHint"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
    // The King keeps his name.
    expect(read("src/locales/en.ts")).toMatch(/duelOpponent: "Trivia King",/);
  });
});
