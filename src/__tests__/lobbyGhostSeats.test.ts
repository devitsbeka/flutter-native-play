/**
 * A brand-new room has no ghosts.
 *
 * The lobby keeps a departed player's row a moment, faded, to say "left".
 * Two things made those rows appear on a room nobody had left (owner's
 * screenshot: the same player twice, greyed, on a fresh room):
 *
 *  - the lobby is not remounted when the host leaves one room and makes
 *    another, and the roster diff had no idea the room had changed - so the
 *    old table's players read as having left the new one;
 *  - the effect's own cleanup cancelled the removal timer on every roster
 *    change, so once a ghost appeared, anyone moving kept it there.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const effect = lobby.slice(lobby.indexOf("// Play sound when new participant joins"), lobby.indexOf("}, [participants, currentRoom?.id, user?.id, playSound]);"));

describe("the roster diff knows which room it is diffing", () => {
  it("a different room starts its history fresh and drops the old notes", () => {
    expect(lobby).toMatch(/const prevRoomIdRef = useRef<string \| null>\(null\);/);
    expect(effect).toMatch(/if \(roomId !== prevRoomIdRef\.current\) \{[\s\S]*?prevRoomIdRef\.current = roomId;\s*prevParticipantsRef\.current = seatedIds;\s*prevFacesRef\.current = faces;\s*setSeatNotes\(new Map\(\)\);\s*setDeparted\(\[\]\);\s*return;\s*\}/);
    // The diff itself only runs once the room is known to be the same one.
    expect(effect.indexOf("if (roomId !== prevRoomIdRef.current)")).toBeLessThan(effect.indexOf("const prevIds = prevParticipantsRef.current;"));
  });
});

describe("a 'left' note is removed on time", () => {
  it("its timer outlives the next roster change", () => {
    expect(lobby).toMatch(/const noteTimersRef = useRef<number\[\]>\(\[\]\);/);
    expect(effect).toMatch(/noteTimersRef\.current\.push\(\s*window\.setTimeout\(/);
    // Not cleared by the effect's cleanup any more - only on unmount.
    expect(effect).not.toMatch(/return \(\) => timers\.forEach/);
    expect(lobby).toMatch(/useEffect\(\(\) => \(\) => noteTimersRef\.current\.forEach\(\(id\) => window\.clearTimeout\(id\)\), \[\]\);/);
  });
});
