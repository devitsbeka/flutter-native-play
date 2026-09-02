/**
 * "Most Likely To" is a private room's game.
 *
 * Friends the host invited, voting on each other: it is not a public
 * category. The owner's rule is that it appears in the library only when a
 * private room picks its rounds, and on no public surface — not Discover,
 * not a published room's picker, not quick play. These pin the wiring.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("Most Likely To stays out of the public library", () => {
  it("both pickers list party categories only when the opener allows it", () => {
    for (const f of ["src/components/team/CategoryPickerModal.tsx", "src/components/team/CategorySelectorModal.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/allowParty = false,/);
      expect(src).toMatch(/\(allowParty \? pinPartyCategoriesFirst : excludePartyCategories\)/);
      // The list is cached per answer, or a private pick would show a public wall.
      expect(src).toMatch(/queryKey: \[[^\]]*allowParty\]/);
    }
  });

  it("a room's pickers allow it only while the room is private", () => {
    expect(read("src/components/team/RoomLobbyV2.tsx")).toMatch(/allowParty=\{!currentRoom\?\.is_public\}/);
    expect(read("src/components/team/GameResultsScreenV2.tsx")).toMatch(/allowParty=\{!currentRoom\?\.is_public\}/);
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create.match(/allowParty=\{!publishRoom\}/g)?.length).toBe(2);
    // And picking it takes the public switch away: the room stays private.
    expect(create).toMatch(/const canPublish =\s*\n\s*\(gameChoice === "random" \|\| gameChoice === "library" \|\| gameChoice === "battle"\) && !partyPicked;/);
  });

  it("Discover, the public library, never lists it", () => {
    const discover = read("src/pages/Discover.tsx");
    expect(discover).toMatch(/const categories = useMemo\(\(\) => excludePartyCategories\(allCategories\), \[allCategories\]\);/);
  });

  it("TV and the side menu open the pickers without it", () => {
    expect(read("src/pages/TVHostController.tsx")).not.toMatch(/allowParty/);
    expect(read("src/components/home/SideMenuDrawer.tsx")).not.toMatch(/allowParty/);
  });
});
