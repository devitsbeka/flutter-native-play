/**
 * "+ Room" on the rooms hub goes straight to a lobby.
 *
 * It used to open the play chooser — "what will you play?", the solo games
 * and a Play With Friends door — so a person on the Online Game page who
 * pressed a button called Room was shown two screens asking what they
 * wanted before they saw the room they had asked for (owner: "when i'm on
 * online game page and i click +room i should see lobby instantly, we
 * don't need to show solo games and play with friends screen").
 *
 * Both doors on this page — the Public tab's "+ Room" and the Private
 * tab's empty-state one — now take the path the Private tab's Create →
 * Game Room already took: make the room, land in its lobby. The chooser is
 * not gone; it is still where the home Play button lands, because there
 * the solo games ARE the question. It just no longer stands between a
 * Room button and a room.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hub = read("src/pages/TeamV2.tsx");

describe("the Public tab's + Room", () => {
  it("makes the room and opens its lobby, without the chooser", () => {
    expect(hub).toMatch(
      /const openCreateRoom = \(\) => \{\s*\n\s*if \(roomsLocked\) return setShowRoomsWall\(true\);\s*\n\s*void createPrivateRoomAndOpen\(\);\s*\n\s*\};/,
    );
  });

  it("still meets the PRO wall first — the padlock on the button is the wall on the tap", () => {
    const fn = hub.slice(hub.indexOf("const openCreateRoom"), hub.indexOf("void createPrivateRoomAndOpen();"));
    expect(fn).toMatch(/if \(roomsLocked\) return setShowRoomsWall\(true\);/);
  });

  it("is the same room the Private tab's Create → Game Room makes", () => {
    // One path, pinned on the create-type modal too (publicRooms.test): a
    // Room from either tab cannot be a different kind of room.
    expect(hub).toMatch(/onSelectGameRoom=\{\(\) => void createPrivateRoomAndOpen\(\)\}/);
  });
});

describe("the Private tab's empty-state + Room", () => {
  it("takes the same door, not the chooser", () => {
    expect(hub).toMatch(/onCreateRoom=\{openCreateRoom\}/);
    expect(hub).not.toMatch(/onCreateRoom=\{\(\) => setShowCreateModal\(true\)\}/);
  });
});

describe("the chooser is not dead, only no longer in the way", () => {
  it("is still where the home Play button lands", () => {
    // Arrival with intent to create opens it — that door is the one place
    // the solo games belong. Nobody should read the change above as "the
    // chooser is unused" and remove it.
    expect(hub).toMatch(/if \(location\.state\?\.openCreateRoom\) \{\s*\n\s*setShowCreateModal\(true\);/);
    expect(hub).toMatch(/const createOpen = showCreateModal \|\| arrivedToCreate\.current;/);
  });
});
