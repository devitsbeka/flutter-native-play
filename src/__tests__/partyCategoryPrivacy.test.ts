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
    // The DOOR the host came through, not whether the room has become
    // publishable yet. This read `!publishRoom`, which is false whenever
    // canPublish is false for an unrelated reason — a game choice that is
    // not one of the three, or a party category already picked — and so
    // offered the vote game on the Public tab in those moments.
    expect(create.match(/allowParty=\{!isPublic\}/g)?.length).toBe(2);
    expect(create).not.toMatch(/allowParty=\{!publishRoom\}/);
    expect(create).toMatch(/const isPublic = createsPublicRooms;/);
    // And picking it takes the room off the Public tab: it stays private.
    expect(create).toMatch(/const canPublish =\s*\n\s*\(gameChoice === "guess" \|\| gameChoice === "library" \|\| gameChoice === "battle"\) && !partyPicked;/);
  });

  it("the team menu's library follows the tab it was opened from", () => {
    // This one handed its pick straight to a CreateRoomPage that is public
    // whenever the Public tab is open — and allowed party unconditionally,
    // which is how the vote game reached a public room's library.
    const team = read("src/pages/TeamV2.tsx");
    expect(team).toMatch(/allowParty=\{activeTab !== "public"\}/);
    expect(team).toMatch(/createsPublicRooms=\{activeTab === "public"\}/);
  });

  it("nowhere says allowParty and means it unconditionally", () => {
    // `allowParty` with no value is `true`, and it reads like a flag being
    // declared rather than a decision being made — which is exactly how the
    // bug above went unnoticed. Every call site states its condition.
    const files = [
      "src/pages/TeamV2.tsx",
      "src/pages/TVHostController.tsx",
      "src/components/team/CreateRoomPage.tsx",
      "src/components/team/RoomLobbyV2.tsx",
      "src/components/team/GameResultsScreenV2.tsx",
    ];
    for (const f of files) {
      expect(read(f), f).not.toMatch(/^\s*allowParty\s*$/m);
      expect(read(f), f).not.toMatch(/allowParty\s*\/>/);
    }
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
