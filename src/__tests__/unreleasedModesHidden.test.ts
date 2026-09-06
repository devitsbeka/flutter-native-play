import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEVELOPER_ONLY_GAME_TYPES, isDeveloperOnlyGameType } from "@/game-types/registry";
import {
  privateFilterOptions,
  publicRoomFilterOptions,
  roomFilterOptions,
  visibleFilter,
  visibleFilterOptions,
} from "@/components/team/UnifiedFiltersBar";

/**
 * Versus King and Trivia Battle are not released.
 *
 * The play chooser already hid them, but the rooms page did not: both were
 * chips in the filter menu, and their rooms were listed under "all" — so a
 * player could see, and join, a mode they cannot start.
 *
 * One set says which modes those are; the menus and both room lists ask it.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("which modes are unreleased", () => {
  it("is one set, and it reads a room's own nullable key", () => {
    expect([...DEVELOPER_ONLY_GAME_TYPES].sort()).toEqual(["king", "team_battle"]);
    expect(isDeveloperOnlyGameType("king")).toBe(true);
    expect(isDeveloperOnlyGameType("team_battle")).toBe(true);
    expect(isDeveloperOnlyGameType("words")).toBe(false);
    expect(isDeveloperOnlyGameType(null)).toBe(false);
    expect(isDeveloperOnlyGameType(undefined)).toBe(false);
  });
});

describe("the filter menus", () => {
  const values = (opts: { value: string }[]) => opts.map((o) => o.value);

  it("drop the unreleased modes' chips with developer mode off", () => {
    expect(values(visibleFilterOptions(privateFilterOptions, false))).not.toContain("king");
    expect(values(visibleFilterOptions(privateFilterOptions, false))).not.toContain("team_battle");
    expect(values(visibleFilterOptions(publicRoomFilterOptions, false))).not.toContain("battles");
    expect(values(visibleFilterOptions(roomFilterOptions, false))).not.toContain("king");
    expect(values(visibleFilterOptions(roomFilterOptions, false))).not.toContain("team_battle");
  });

  it("offer them again with it on", () => {
    expect(values(visibleFilterOptions(privateFilterOptions, true))).toContain("king");
    expect(values(visibleFilterOptions(publicRoomFilterOptions, true))).toContain("battles");
    expect(values(visibleFilterOptions(roomFilterOptions, true))).toContain("team_battle");
  });

  it("keep every other chip either way", () => {
    for (const opts of [privateFilterOptions, publicRoomFilterOptions, roomFilterOptions]) {
      const off = values(visibleFilterOptions(opts, false));
      const on = values(visibleFilterOptions(opts, true));
      expect(on).toEqual(values(opts));
      expect(off).toEqual(on.filter((v) => !["king", "team_battle", "battles"].includes(v)));
    }
  });

  it("fall back rather than apply a filter that is off the menu", () => {
    // A filter chosen while developer mode was on, then left behind when it
    // went off, would otherwise filter the list by a game nobody can see —
    // an empty tab with a chip name that is not in its own menu.
    expect(visibleFilter("team_battle", privateFilterOptions, false, "all")).toBe("all");
    expect(visibleFilter("battles", publicRoomFilterOptions, false, "all")).toBe("all");
    expect(visibleFilter("team_battle", privateFilterOptions, true, "all")).toBe("team_battle");
    expect(visibleFilter("my_rooms", privateFilterOptions, false, "all")).toBe("my_rooms");
  });
});

describe("the room lists", () => {
  it("the private list drops the rooms too, not just the chip", () => {
    // Every private surface — the rooms page, the home rail, the widgets,
    // spotlight search — reads useMyRooms, so the gate belongs in it.
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(/const \{ developerMode \} = useDeveloperMode\(\);/);
    expect(hook).toMatch(/if \(!developerMode\) \{\s*\n\s*result = result\.filter\(\(room\) => !isDeveloperOnlyGameType\(room\.game_type_key\)\);/);
    // And the memo recomputes when the switch is flipped.
    expect(hook).toMatch(/\}, \[activeRooms, filter, friendIds, searchQuery, invitedRoomIds, visibility, developerMode\]\);/);
  });

  it("the public tab passes the viewer's mode in", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/const \{ developerMode \} = useDeveloperMode\(\);/);
    expect(section).toMatch(/filterPublicRooms\(data \?\? \[\], filter, searchQuery, roomsCtx, developerMode\)/);
  });

  it("the rooms page applies the fallback filter, not the raw one", () => {
    const page = read("src/pages/TeamV2.tsx");
    expect(page).toMatch(/const publicFilterApplied = visibleFilter\(publicFilter, publicRoomFilterOptions, developerMode, "all"\);/);
    expect(page).toMatch(/const privateFilterApplied = visibleFilter\(privateFilter, privateFilterOptions, developerMode, "all"\);/);
    expect(page).toMatch(/<PublicRoomsSection filter=\{publicFilterApplied\}/);
    expect(page).toMatch(/filterOptions=\{publicFilterOptionsShown\}/);
    expect(page).toMatch(/filterOptions=\{privateFilterOptionsShown\}/);
  });
});
