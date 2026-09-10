/**
 * Both create buttons wear the padlock, because both open the same wall.
 *
 * The Public tab's "+ Room" said PRO before it was pressed — a padlock on
 * the button and the wall on the tap, rather than the wall four screens in.
 * The Private tab's "Create" sat beside it with no lock and opened the
 * chooser for everybody, so the same hub offered the same act as free on
 * one tab and paid on the other.
 *
 * The wall behind that lock was never only about rooms: its own line reads
 * "Create game rooms and trivias" (playLimit.roomsLockedBody), which is
 * exactly what the chooser makes — a room at the top and the trivia types
 * under it. One gate for one wall (owner: "when user is not pro we should
 * lock 'create' button too").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hub = read("src/pages/TeamV2.tsx");

describe("the Private tab's create button is gated like the Public one", () => {
  it("opens the wall instead of the chooser when the player is not PRO", () => {
    expect(hub).toMatch(
      /const openCreateType = \(\) => \{\s*\n\s*if \(roomsLocked\) return setShowRoomsWall\(true\);\s*\n\s*setShowCreateTypeModal\(true\);\s*\n\s*\};/,
    );
  });

  it("and every door to the chooser goes through it — no raw opener left on a button", () => {
    expect(hub).toMatch(/activeTab === "public" \? openCreateRoom\("public"\) : openCreateType\(\)/);
    expect(hub).toMatch(/onAddClick=\{openCreateType\}/);
  });

  it("the same gate the rooms button already used, not a second one", () => {
    // Both helpers read `roomsLocked` and raise the same wall, so a player
    // cannot be locked out of one and into the other.
    expect(hub).toMatch(/const roomsLocked = !isVip;/);
    expect(
      (hub.match(/if \(roomsLocked\) return setShowRoomsWall\(true\);/g) ?? []).length,
    ).toBe(2);
  });
});

describe("and it says so before it is pressed", () => {
  it("the padlock is no longer public-only on the wide button", () => {
    expect(hub).toMatch(
      /\{!triviaBusy && roomsLocked && <Lock className="h-4 w-4" strokeWidth=\{2\.5\} \/>\}/,
    );
    expect(hub).not.toMatch(/activeTab === "public" && roomsLocked/);
  });

  it("and the phone's filter bar locks both its add buttons", () => {
    expect((hub.match(/addLocked=\{roomsLocked\}/g) ?? []).length).toBe(2);
  });

  it("a locked button still opens the door rather than going dead", () => {
    // UnifiedFiltersBar's own contract: the lock is a label, not a disable.
    const bar = read("src/components/team/UnifiedFiltersBar.tsx");
    expect(bar).toMatch(/\{!addBusy && addLocked && <Lock/);
    expect(bar).not.toMatch(/disabled=\{addLocked/);
  });
});
