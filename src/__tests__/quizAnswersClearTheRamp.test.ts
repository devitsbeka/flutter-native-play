/**
 * The last answer is never left under the footer's frosted ramp.
 *
 * The quiz footers sit on QuizBottomBlur, a ramp that starts REACH px above
 * the controls. The answers scroller padded by the footer's height alone,
 * so on a short screen the fourth answer came to rest inside the ramp —
 * blurred, and in red a blurred wrong answer read as a broken render
 * (owner: "make sure blur is gone and answer D is visible"). The scrollers
 * pad by the ramp's reach too, the ramp is shorter, and the reveal scrolls
 * the list to its end so the verdict is read where it lands.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUIZ_BLUR_REACH, QUIZ_PLAY_BLUR_REACH } from "@/components/game/QuizBottomBlur";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ramp = read("src/components/game/QuizBottomBlur.tsx");

describe("the ramp's reach is one number", () => {
  it("shorter than the 140 that swallowed a whole answer, and the default", () => {
    expect(QUIZ_BLUR_REACH).toBeLessThanOrEqual(96);
    expect(ramp).toMatch(/export function QuizBottomBlur\(\{ reach = QUIZ_BLUR_REACH \}/);
  });

  it("and in play it is a soft edge, not a ramp", () => {
    // 88px of frost over the power-ups' ~100px still took the fourth answer
    // on a short phone (owner: "i still see blur covers last answer while
    // playing guess game"). The full ramp is for the verdict.
    expect(QUIZ_PLAY_BLUR_REACH).toBeLessThanOrEqual(32);
    expect(QUIZ_PLAY_BLUR_REACH).toBeLessThan(QUIZ_BLUR_REACH);
  });
});

describe.each([
  ["src/pages/CategoryQuizPage.tsx", "isAnswered"],
  ["src/components/game/QuizGameScreenProd.tsx", "answerRevealed"],
])("%s", (file, revealFlag) => {
  const src = read(file);

  it("pads every answers scroller by the footer AND the ramp it is showing", () => {
    expect(src).toMatch(new RegExp(`const rampReach = ${revealFlag} \\? QUIZ_BLUR_REACH : QUIZ_PLAY_BLUR_REACH;`));
    expect(src).toMatch(/<QuizBottomBlur reach=\{rampReach\} \/>/);
    const pads = src.match(/paddingBottom: footerHeight \+ rampReach/g) ?? [];
    expect(pads).toHaveLength(2);
    expect(src).not.toMatch(/paddingBottom: footerHeight \}\}/);
    expect(src).not.toMatch(/paddingBottom: footerHeight \+ QUIZ_BLUR_REACH/);
  });

  it("scrolls the list to its end on the reveal", () => {
    expect(src).toMatch(/const answersRef = useRef<HTMLDivElement \| null>\(null\);/);
    expect(src).toMatch(new RegExp(`if \\(!${revealFlag}\\) return;\\s*\\n\\s*const el = answersRef\\.current;\\s*\\n\\s*if \\(!el\\) return;\\s*\\n\\s*el\\.scrollTo\\(\\{ top: el\\.scrollHeight, behavior: "smooth" \\}\\);`));
    expect(src).toMatch(/ref=\{answersRef\}/);
  });
});
