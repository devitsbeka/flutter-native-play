/**
 * The party card's Play, in the same button every room card plays from.
 *
 * It was ChunkyButton's generic "outline" variant — transparent face,
 * purple border and text — borrowed rather than drawn to this button's own
 * spec, and it read as a lesser action beside every filled, white Play on
 * the room cards around it. RoomCardPlayButton gains a third tone for it:
 * filled purple, white icon and text, same shape as mint and white.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const button = read("src/components/team/RoomCardPlayButton.tsx");
const tab = read("src/components/social/MyTriviaTab.tsx");

describe("RoomCardPlayButton's purple tone", () => {
  it("is filled, not outlined — a purple face with white text and icon", () => {
    expect(button).toMatch(/export type RoomCardTone = "mint" \| "white" \| "purple";/);
    expect(button).toMatch(/purple: "bg-\[#7126d5\] border-\[#4e1a94\] text-white",/);
  });
});

describe("the party card's Play wears it", () => {
  it("RoomCardPlayButton, not ChunkyButton's outline variant", () => {
    expect(tab).toMatch(/import \{ RoomCardPlayButton \} from "@\/components\/team\/RoomCardPlayButton";/);
    const card = tab.slice(tab.indexOf("function PersonalTriviaCard"), tab.indexOf("function", tab.indexOf("function PersonalTriviaCard") + 1));
    expect(card).toMatch(/<RoomCardPlayButton\s*\n\s*tone="purple"/);
    expect(card).not.toMatch(/variant="outline"/);
  });
});
