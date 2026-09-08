/**
 * The host's own room card always has a way to fill it, wherever the room
 * still has a seat.
 *
 * The Public tab's cards already draw a dashed "+" for every open seat.
 * Private cards never did: a room with only the host in it drew a wide,
 * empty bar with nothing to tap, and a room with somebody else already in
 * it had no way to add a third without opening it first.
 *
 * The "+" sits before the faces, in the SAME place, whether or not the room
 * also has a Play button on the right. It briefly moved to the right side
 * when there was no Play button to share the row with — but which side that
 * was depended on who else happened to be online, so the same room could
 * show the "+" on one side today and the other tomorrow, and the owner said
 * so directly: "it is confusing now". One position, always.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const grid = read("src/components/team/MyRoomsSection.tsx");

describe("the room card's own invite", () => {
  it("only the host, and only while a seat is open", () => {
    expect(grid).toMatch(
      /const canInvite = room\.is_host && \(!room\.max_players \|\| displayPlayerCount < room\.max_players\);/,
    );
  });

  it("always before the faces, never on the right", () => {
    const beforeFaces = grid.slice(
      grid.indexOf('{canInvite && ('),
      grid.indexOf("Avatars (use TV players if session is active)"),
    );
    expect(beforeFaces).toMatch(/onInvite\?\.\(room\);/);
    expect(beforeFaces).toMatch(/aria-label=\{t\("extra\.inviteFriendsTitle"\)\}/);
    // Not gated on `action` any more — it used to appear here only when a
    // Play button was also on the right, and jump to the right side
    // otherwise. Now it is unconditional on canInvite alone.
    expect(grid).not.toMatch(/canInvite && action &&/);
  });

  it("and the right side is Play or nothing — never the invite button", () => {
    const start = grid.lastIndexOf("</RoomCardPlayButton>");
    const rightSide = grid.slice(start, grid.indexOf("</GradientBackground>", start));
    expect(rightSide).not.toMatch(/onInvite\?\.\(room\)/);
    expect(grid).toMatch(/\{action && \(\s*\n\s*\/\* The public list's button in white/);
  });

  it("opens the same sheet the Public tab's cards use", () => {
    expect(grid).toMatch(/import \{ InviteFriendsModal \} from "@\/components\/team\/InviteFriendsModal";/);
    expect(grid).toMatch(/const \[inviting, setInviting\] = useState<MyRoom \| null>\(null\);/);
    expect(grid).toMatch(/<InviteFriendsModal\s*\n\s*isOpen=\{inviting !== null\}/);
    expect(grid).toMatch(/roomId=\{inviting\?\.id\}\s*\n\s*roomCode=\{inviting\?\.room_code\}/);
    expect(grid).toMatch(/onInvite=\{setInviting\}/);
  });
});
