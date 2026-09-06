/**
 * "What will you play?" and "What will you guess?" wear the display face.
 *
 * The two chooser headings were set in Nunito while the paywall's "Get
 * unlimited access" is in the app's display face; the owner asked for the
 * same face on all three. Size, leading and ink stay the chooser's own.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the chooser headings wear the display face", () => {
  const heading = /className="shrink-0 pb-\[13px\] pt-\[7px\] font-display text-\[24px\] leading-\[28px\] text-\[#3a2260\]"/;

  it("what will you play", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(heading);
    expect(create).not.toMatch(/font-\[Nunito\] text-\[24px\] leading-\[28px\] tracking-\[-0\.3px\]/);
  });

  it("what will you guess", () => {
    const screen = read("src/components/team/GuessPickerScreen.tsx");
    expect(screen).toMatch(heading);
    // The card labels below the heading keep Nunito; only the heading moved.
    expect(screen).not.toMatch(/<h2[^>]*font-\[Nunito\]/);
  });

  it("the same face the paywall title wears", () => {
    expect(read("src/components/pro/ProPaywallModal.tsx")).toMatch(/text-center font-display text-\[clamp\(21px,6vw,28px\)\] uppercase leading-\[1\.2\]/);
  });
});
