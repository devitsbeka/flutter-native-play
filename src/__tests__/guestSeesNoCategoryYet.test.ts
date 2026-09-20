import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * "Select Category" is an instruction, so only somebody who can follow it
 * is given it.
 *
 * The chip at the top of a lobby said "Select Category" to everybody while
 * the room had no rounds yet. For the host that is the thing to do next,
 * and it comes with a "+" and a tap that opens the picker. For an invited
 * player it was a to-do list belonging to somebody else: no "+", no tap
 * behind it, and no way to tell whether the room was still being built or
 * something had gone wrong (owner: "as an invited player i see private room
 * with no category selected there, show no category selected or something,
 * host sees select category with + button but other players should see if
 * there are not selected categories yet").
 *
 * A guest is told the state instead — "No category chosen yet" — which is
 * what they actually need to know while they wait.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("who the category chip is for", () => {
  it("is one predicate, so the label cannot disagree with the button", () => {
    // The label, the tap and the "+" all hang off it. Spelt out three
    // times, the label is exactly the one that gets forgotten.
    expect(lobby).toMatch(/const canPickCategory = isHost && !rulesLocked;/);
    expect(lobby).toMatch(/onAdd: canPickCategory \? \(\)/);
    expect(lobby).toMatch(/: canPickCategory\s*\n\s*\? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \}/);
  });

  it("reads as a to-do for the host and as a state for everybody else", () => {
    expect(lobby).toMatch(
      /\? canPickCategory\s*\n\s*\? t\("lobby\.uSelectCategory"\)\s*\n\s*: t\("lobby\.uNoCategoryYet"\)/,
    );
  });

  it("which covers a host who cannot pick either", () => {
    // `rulesLocked` is a live match or a published room. Gated on isHost
    // alone, the host of a settled room would still be told to go and
    // select a category by a chip that no longer opens anything.
    expect(lobby).toMatch(/const rulesLocked = matchLive \|\| publishedRoom;/);
  });

  it("and says it in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/uNoCategoryYet: "[^"]+",/);
      // Both still exist: they are two different sentences, not a rename.
      expect(locale, lang).toMatch(/uSelectCategory: "[^"]+",/);
    }
  });
});
