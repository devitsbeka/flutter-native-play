/**
 * Three small things from one screenshot round (owner's asks).
 *
 *  - The Private tab's invite badge is a white container with the count
 *    in the tab's purple. A purple dot on the grey closed tab read as a
 *    button ("show notification on private tab as white container with
 *    dark (purple) number in it").
 *  - Confirm on an invited room's card answers the invite before it opens
 *    the room. Nothing marked the invite's notification read, so the card
 *    still said Confirm, in green, after the seat had been taken ("when i
 *    confirm once on room invitation and i enter the room, do not show
 *    confirm button again, i should be in a room after confirmation").
 *  - In the live race strip, two or three players sit sideways with the
 *    score beside the face; the rings are box-shadows painted outside the
 *    face's box, so a 6px gap had the score touching the ring ("increase
 *    space between avatar and points, they are touching each other").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the Private tab's badge", () => {
  it("is white with the count in purple", () => {
    const page = read("src/pages/TeamV2.tsx");
    const badge = page.slice(page.indexOf('{tab.id === "private" && pendingInviteCount > 0 && ('));
    expect(badge).toMatch(/rounded-full bg-white px-1 text-\[11px\] font-bold leading-none text-\[#7126d5\]/);
  });
});

describe("Confirm answers the invite, then enters", () => {
  const invites = read("src/utils/pendingRoomInvites.ts");
  const myRooms = read("src/components/team/MyRoomsSection.tsx");
  const publicRooms = read("src/components/team/PublicRoomsSection.tsx");

  it("the answer is the invite's notification marked accepted, which is what retires it", () => {
    expect(invites).toMatch(/export function acceptRoomInvite\(notificationId: string\): void \{\s*\n\s*void markNotificationActioned\(notificationId, "accepted"\)/);
    // "Pending" is "its notification is still unread", and marking it
    // actioned writes read_at — one source of truth, on both tabs.
    expect(invites).toMatch(/if \(n\.type !== "room_invite" \|\| n\.read_at\) continue;/);
    expect(read("src/utils/notificationActions.ts")).toMatch(/\.update\(\{ read_at: new Date\(\)\.toISOString\(\), data: merged \}\)/);
  });

  it("the private card answers before it opens the room", () => {
    const join = myRooms.slice(myRooms.indexOf("const handleJoin = async (room: MyRoom)"), myRooms.indexOf("const openRoom = async"));
    expect(join).toMatch(/if \(room\.has_pending_invite && room\.pending_invite_from\) \{\s*\n\s*acceptRoomInvite\(room\.pending_invite_from\.notificationId\);\s*\n\s*\}\s*\n\s*setJoiningRoomId\(room\.id\);/);
  });

  it("the public card answers before it enters", () => {
    expect(publicRooms).toMatch(/const enter = \(\) => \{\s*\n(\s*\/\/[^\n]*\n)*\s*if \(invited && inviteFrom\) acceptRoomInvite\(inviteFrom\.notificationId\);\s*\n\s*navigate\(publicRoomPath\(room\)\);\s*\n\s*\};/);
  });

  it("and neither waits on the write — the tap goes into the room", () => {
    expect(invites).not.toMatch(/export async function acceptRoomInvite/);
  });
});

describe("the race strip, sideways", () => {
  it("keeps 12px between the face and its score, clear of the rings", () => {
    const strip = read("src/components/game/LiveRaceStrip.tsx");
    expect(strip).toMatch(/sideways\s*\n\s*\? "items-center gap-3"/);
    expect(strip).not.toMatch(/"items-center gap-1\.5"/);
  });
});
