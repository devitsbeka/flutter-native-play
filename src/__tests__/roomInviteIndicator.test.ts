/**
 * An invitation is visible where the room is, not only in the bell.
 *
 * Being asked into a room already did two quiet things: the card sorted to
 * the top of the Private tab, and a notification landed in the centre. But
 * the card itself looked like every other, and a player scrolling Public
 * had nothing on screen pointing at the tab (owner's ask: "show that room
 * with some indicator... notification on private tab for me to switch tabs
 * and see who invited me").
 *
 * Both indicators come from the same fact the hook already had - an unread
 * room_invite notification for a room in the list - so they retire together
 * the moment the room is opened and the notification is read.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the hook says who asked, and how many are waiting", () => {
  const hook = read("src/hooks/useMyRooms.ts");

  it("carries the sender's snapshot from the notification onto the room", () => {
    const reader = read("src/utils/pendingRoomInvites.ts");
    expect(hook).toMatch(/pending_invite_from: PendingInviteFrom \| null;/);
    expect(reader).toMatch(/nickname: data\.sender_nickname \?\? null,/);
    expect(reader).toMatch(/avatar_url: data\.sender_avatar \?\? null,/);
    // Still keyed off the unread notification - no second source of truth.
    expect(reader).toMatch(/if \(n\.type !== "room_invite" \|\| n\.read_at\) continue;/);
    expect(hook).toMatch(/const pendingInvites = useMemo\(\(\) => pendingRoomInvites\(notifications\), \[notifications\]\);/);
  });

  it("counts the invited rooms before the limit cuts the list", () => {
    const ret = hook.slice(hook.indexOf("return {\n    rooms: filteredRooms.slice(0, limit)"));
    expect(ret).toMatch(/pendingInviteCount: filteredRooms\.filter\(\(room\) => room\.has_pending_invite\)\.length,/);
  });
});

describe("the card wears the invitation", () => {
  const grid = read("src/components/team/MyRoomsSection.tsx");
  const card = grid.slice(grid.indexOf("export function RoomCardGrid("));

  it("as the viewer's own face in black and white, and a green Confirm with an X — not a badge", () => {
    // The purple "Invited by …" pill was one thing too many on the row
    // (owner: "it is too much on cards"); see roomInviteConfirm.test.
    expect(card).toMatch(/const reservedForMe = room\.has_pending_invite && p\.user_id === user\?\.id;/);
    expect(card).toMatch(/tone=\{room\.has_pending_invite \? "mint" : "white"\}/);
    expect(card).not.toMatch(/RoomInviteBadge/);
  });

  it("with the inviter's snapshot still on the room, for the answer to find its notification", () => {
    // The X's handler lives on the section, above the card.
    expect(grid).toMatch(/room\.pending_invite_from\.notificationId/);
  });
});

describe("the Private tab says so while Public is on screen", () => {
  const page = read("src/pages/TeamV2.tsx");

  it("reads the count from the private list, whatever tab is open", () => {
    expect(page).toMatch(/const \{ pendingInviteCount \} = useMyRooms\(\{ visibility: "private", limit: 1 \}\);/);
  });

  it("and draws a count badge on the private tab only", () => {
    expect(page).toMatch(/\{tab\.id === "private" && pendingInviteCount > 0 && \(/);
    const badge = page.slice(page.indexOf('{tab.id === "private" && pendingInviteCount > 0 && ('));
    expect(badge).toMatch(/bg-\[#7126d5\][^"]*text-white/);
    expect(badge).toMatch(/\{pendingInviteCount\}/);
  });
});

describe("the pill is written in every language", () => {
  it("all seven", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+roomInvitedYou: "[^"]+",/);
    }
  });
});
