/**
 * The Guess duel fits a short phone: four answers above the foot.
 *
 * On the owner's phone the fourth answer sat inside the foot's frost
 * whatever the scroller was padded by (owner: "i still see blur covers
 * last answer while playing guess game, fix it"), because what stood
 * above it was too tall: a 90px scoreboard of two avatars with scores
 * under them, a 40px gap meant for an icon that overhangs a TEXT
 * question's card, and a 144px picture. Three cuts, and a softer foot:
 *
 *  - the scoreboard is one 40px row — face, points, VS, points, face;
 *  - a picture question's card sits 12px under it, not 40;
 *  - the picture is 112px on a screen under 700px, not 144;
 *  - and in play the foot's frost reaches 24px, not 88
 *    (quizAnswersClearTheRamp.test.ts).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const level = read("src/pages/CategoryQuizPage.tsx");
const card = read("src/components/ui/quiz-question-card.tsx");

describe("what stands above the answers in a duel", () => {
  it("the scoreboard is one row, 40px faces", () => {
    expect(level).toMatch(/function DuelFace\(/);
    expect(level).toMatch(/size="sm" autoPlay=\{false\} showSparkle=\{false\}/);
    expect(level).toMatch(/function DuelPoints\(/);
    expect(level).not.toMatch(/QuizPlayerAvatar/);
    const board = level.slice(level.indexOf("{guessStake && ("), level.indexOf("Question Card with Overlapping Icon"));
    expect(board).toMatch(/className="flex items-center justify-center gap-3 px-4 pt-2 flex-shrink-0"/);
  });

  it("a picture question's card clears no icon, so it sits close", () => {
    expect(level).toMatch(/currentQuestion\?\.image_url \? "mt-3 \[@media\(max-height:700px\)\]:mt-2" : "mt-10 \[@media\(max-height:700px\)\]:mt-6 \[@media\(max-height:600px\)\]:mt-4"/);
  });

  it("the picture is shorter on a short screen", () => {
    expect(card).toMatch(/"w-full h-36 \[@media\(max-height:700px\)\]:h-28 overflow-hidden relative flex items-center justify-center",/);
  });
});
