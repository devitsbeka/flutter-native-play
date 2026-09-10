/**
 * "What will you play?" wears the display face — and "What will you guess?"
 * did, until its grid became the versus screen.
 *
 * The two chooser headings were set in Nunito while the paywall's "Get
 * unlimited access" is in the app's display face; the owner asked for the
 * same face on all three. Size, leading and ink stay the chooser's own.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the chooser headings wear the display face", () => {
  // The face, the size, the leading and the ink. The padding around it is
  // each screen's own: Figma 1102:4978 sets the chooser's heading 27px in and
  // 151px down, which is spacing, not typography — and the mock's Nunito is
  // exactly what the owner asked to be rid of, so it stays gone.
  const heading = /font-display font-bold text-\[24px\] leading-\[28px\] text-\[#3a2260\]"/;

  it("what will you play", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(heading);
    expect(create).not.toMatch(/font-\[Nunito\] text-\[24px\] leading-\[28px\] tracking-\[-0\.3px\]/);
  });

  it("what will you guess — a heading that is gone with its grid", () => {
    // The picker grid became the quick game's versus screen, which has no
    // heading at all (guessVersusScreen.test.ts); nothing here to set in
    // Nunito, and nothing left to wear the display face.
    expect(existsSync(join(process.cwd(), "src/components/team/GuessPickerScreen.tsx"))).toBe(false);
    expect(read("src/components/game/GuessVersusScreen.tsx")).not.toMatch(/extra\.guessPickTitle/);
  });

  it("the same face the paywall title wears", () => {
    expect(read("src/components/pro/ProPaywallModal.tsx")).toMatch(/text-center font-display text-\[clamp\(21px,6vw,28px\)\] uppercase leading-\[1\.2\]/);
  });
});
