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
    expect(hook).toMatch(/pending_invite_from: \{ nickname: string \| null; avatar_url: string \| null \} \| null;/);
    expect(hook).toMatch(/nickname: data\.sender_nickname \?\? null,/);
    expect(hook).toMatch(/avatar_url: data\.sender_avatar \?\? null,/);
    // Still keyed off the unread notification - no second source of truth.
    expect(hook).toMatch(/if \(n\.type !== "room_invite" \|\| n\.read_at\) continue;/);
  });

  it("counts the invited rooms before the limit cuts the list", () => {
    const ret = hook.slice(hook.indexOf("return {\n    rooms: filteredRooms.slice(0, limit)"));
    expect(ret).toMatch(/pendingInviteCount: filteredRooms\.filter\(\(room\) => room\.has_pending_invite\)\.length,/);
  });
});

describe("the card wears the invitation", () => {
  const grid = read("src/components/team/MyRoomsSection.tsx");
  const card = grid.slice(grid.indexOf("export function RoomCardGrid("));

  it("a purple pill beside the room's age, gated on the pending invite", () => {
    expect(card).toMatch(/\{room\.has_pending_invite && \(\s*<span className="inline-flex min-w-0 items-center gap-1\.5 whitespace-nowrap rounded-full bg-\[#7126d5\]/);
    expect(card).toMatch(/\{t\("extra\.roomInvitedYou"\)\}/);
  });

  it("with the inviter's face when the notification carried one", () => {
    expect(card).toMatch(/avatarUrl=\{room\.pending_invite_from\.avatar_url\}/);
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
