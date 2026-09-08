/**
 * The host's own room card always has a way to fill it, wherever the room
 * still has a seat.
 *
 * The Public tab's cards already draw a dashed "+" for every open seat.
 * Private cards never did: a room with only the host in it drew a wide,
 * empty bar with nothing to tap, and a room with somebody else already in
 * it had no way to add a third without opening it first.
 *
 * The "+" and the Play button share one row, so which side it lands on
 * depends on whether Play is using the other one: before the faces when
 * Play has the right side, on the right itself when Play has nothing to
 * show (nobody else online) and the side is free.
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

  it("before the faces when the Play button is on the right", () => {
    const beforeFaces = grid.slice(
      grid.indexOf('{canInvite && action && ('),
      grid.indexOf("Avatars (use TV players if session is active)"),
    );
    expect(beforeFaces).toMatch(/onInvite\?\.\(room\);/);
    expect(beforeFaces).toMatch(/aria-label=\{t\("extra\.inviteFriendsTitle"\)\}/);
  });

  it("and on the right itself when there is no Play button to share it with", () => {
    const start = grid.lastIndexOf("</RoomCardPlayButton>");
    const rightSide = grid.slice(start, grid.indexOf("</GradientBackground>", start));
    expect(rightSide).toMatch(/\) : \(/);
    expect(rightSide).toMatch(/canInvite && \(/);
    expect(rightSide).toMatch(/onInvite\?\.\(room\);/);
  });

  it("opens the same sheet the Public tab's cards use", () => {
    expect(grid).toMatch(/import \{ InviteFriendsModal \} from "@\/components\/team\/InviteFriendsModal";/);
    expect(grid).toMatch(/const \[inviting, setInviting\] = useState<MyRoom \| null>\(null\);/);
    expect(grid).toMatch(/<InviteFriendsModal\s*\n\s*isOpen=\{inviting !== null\}/);
    expect(grid).toMatch(/roomId=\{inviting\?\.id\}\s*\n\s*roomCode=\{inviting\?\.room_code\}/);
    expect(grid).toMatch(/onInvite=\{setInviting\}/);
  });
});
