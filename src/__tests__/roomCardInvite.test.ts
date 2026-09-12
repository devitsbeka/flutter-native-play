/**
 * The host's own room card always has a way to fill it, wherever the room
 * still has a seat.
 *
 * The Public tab's cards already draw a dashed "+" for every open seat, as
 * the last seat in the row. Private cards never did: a room with only the
 * host in it drew a wide, empty bar with nothing to tap, and a room with
 * somebody else already in it had no way to add a third without opening it
 * first.
 *
 * The "+" lives in the left-hand group with the faces, in the SAME group,
 * whether or not the room also has a Play button on the right. It briefly
 * moved to the right side when there was no Play button to share the row
 * with — but which side that was depended on who else happened to be
 * online, so the same room could show the "+" on one side today and the
 * other tomorrow, and the owner said so directly: "it is confusing now".
 *
 * Within that left-hand group, it first landed BEFORE the faces — this
 * tab's own invention — and then moved to match where the Public tab has
 * always drawn it, after the faces, as the next seat (owner: "let's show +
 * button next to the avatars on right side, not left side on private rooms
 * too"). Both moves keep the same property: one group, never gated on
 * whether a Play button happens to be on the right.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const grid = read("src/components/team/MyRoomsSection.tsx");
const publicRooms = read("src/components/team/PublicRoomsSection.tsx");

describe("the room card's own invite", () => {
  it("only the host, and only while a seat is open", () => {
    expect(grid).toMatch(
      /const canInvite = room\.is_host && \(!room\.max_players \|\| displayPlayerCount < room\.max_players\);/,
    );
  });

  it("after the faces, matching the Public tab's own order", () => {
    // The avatars' own -space-x-2 group closes, THEN the "+" — both still
    // inside the row's left-hand flex container, not on the Play side.
    const afterFaces = grid.slice(
      grid.indexOf("+{guests.length - avatarLimit}"),
      grid.indexOf('{action && ('),
    );
    expect(afterFaces).toMatch(/canInvite && \(/);
    expect(afterFaces).toMatch(/onInvite\?\.\(room\);/);
    expect(afterFaces).toMatch(/aria-label=\{t\("extra\.inviteFriendsTitle"\)\}/);
    // Not gated on `action` — it used to appear here only when a Play
    // button was also on the right, and jump to the right side otherwise.
    // Unconditional on canInvite alone, same as before this moved.
    expect(grid).not.toMatch(/canInvite && action &&/);
  });

  it("and the right side is Play or nothing — never the invite button", () => {
    // The button is drawn by playButton(); what follows it on the row is
    // the right side.
    const start = grid.lastIndexOf("playButton()");
    const rightSide = grid.slice(start, grid.indexOf("</GradientBackground>", start));
    expect(rightSide).not.toMatch(/onInvite\?\.\(room\)/);
    expect(grid).toMatch(/\{\(\s*\n\s*\/\* The public list's button in white/);
  });

  it("opens the same sheet the Public tab's cards use", () => {
    expect(grid).toMatch(/import \{ InviteFriendsModal \} from "@\/components\/team\/InviteFriendsModal";/);
    expect(grid).toMatch(/const \[inviting, setInviting\] = useState<MyRoom \| null>\(null\);/);
    expect(grid).toMatch(/<InviteFriendsModal\s*\n\s*isOpen=\{inviting !== null\}/);
    expect(grid).toMatch(/roomId=\{inviting\?\.id\}\s*\n\s*roomCode=\{inviting\?\.room_code\}/);
    expect(grid).toMatch(/onInvite=\{setInviting\}/);
  });

  it("and that IS where the Public tab has always drawn its own +", () => {
    expect(publicRooms).toMatch(
      /\{canInvite && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*onClick=\{\(e\) => \{\s*\n\s*e\.stopPropagation\(\);\s*\n\s*onInvite\(room\);/,
    );
    // Drawn after the seat-avatar loop closes, not before it.
    const plusIdx = publicRooms.indexOf('{canInvite && (\n              <button');
    const loopIdx = publicRooms.indexOf("Array.from({ length: seatsToDraw }");
    expect(plusIdx).toBeGreaterThan(loopIdx);
  });
});
