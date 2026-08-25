import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  inviteLinkPath,
  readInviteIntent,
  roomIsFreshEnoughToOffer,
  STALE_ROOM_AFTER_MS,
} from "@/utils/inviteLink";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * An invite link has to say what it is FOR.
 *
 * Every share button sends the same personal /i/<code>, and the destination
 * used to be worked out entirely at the far end as "the most recent waiting
 * room the sender is a participant of". So pressing "+" on the friends strip
 * — a friend request, with no room anywhere on screen — mailed out an
 * invitation to whatever lobby the sender had left open days earlier, with
 * other people's names on it.
 */
describe("what an invite link says it is for", () => {
  it("marks a friends-strip link as a friend request", () => {
    expect(inviteLinkPath("abc123", { kind: "friend" })).toBe("/i/abc123?f=1");
  });

  it("names the room a lobby is inviting into", () => {
    expect(inviteLinkPath("abc123", { kind: "room", roomCode: "XY7Q2B" })).toBe(
      "/i/abc123?r=XY7Q2B",
    );
  });

  it("leaves a Create Room link bare, because the room does not exist yet", () => {
    expect(inviteLinkPath("abc123", { kind: "pending" })).toBe("/i/abc123");
  });

  it("reads each of them back", () => {
    expect(readInviteIntent("?f=1")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?r=XY7Q2B")).toEqual({ kind: "room", roomCode: "XY7Q2B" });
    expect(readInviteIntent("")).toEqual({ kind: "pending" });
  });

  it("treats a link sent before this existed as pending, not as broken", () => {
    // Millions of these are already in people's chat histories.
    expect(readInviteIntent("?utm_source=whatsapp")).toEqual({ kind: "pending" });
    expect(readInviteIntent("?f=0")).toEqual({ kind: "pending" });
    expect(readInviteIntent("?r=")).toEqual({ kind: "pending" });
  });

  it("survives a round trip through the URL", () => {
    const link = inviteLinkPath("abc123", { kind: "room", roomCode: "A B/C" });
    const query = link.slice(link.indexOf("?"));
    expect(readInviteIntent(query)).toEqual({ kind: "room", roomCode: "A B/C" });
  });
});

/**
 * The freshness rule for the one link that still resolves its room late.
 *
 * `status = 'waiting'` and `is_archived = false` are true of a lobby somebody
 * opened on Tuesday and walked away from. That is a real row and it is not
 * what anyone is being invited to — which is exactly how an "add friend" link
 * came to offer a three-day-old room.
 */
describe("whether a late-resolved room is still worth offering", () => {
  const NOW = Date.parse("2026-08-25T12:00:00Z");
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it("offers a room that was touched moments ago", () => {
    expect(roomIsFreshEnoughToOffer(ago(60_000), null, NOW)).toBe(true);
  });

  it("does not offer one left open for days", () => {
    expect(roomIsFreshEnoughToOffer(ago(3 * 24 * 60 * 60 * 1000), null, NOW)).toBe(false);
  });

  it("falls back to when the room was created", () => {
    expect(roomIsFreshEnoughToOffer(null, ago(60_000), NOW)).toBe(true);
    expect(roomIsFreshEnoughToOffer(null, ago(STALE_ROOM_AFTER_MS + 1000), NOW)).toBe(false);
  });

  it("offers the room when there is no timestamp to judge it by", () => {
    // invite_preview already held it to waiting and un-archived; hiding a
    // genuinely open room is the worse of the two mistakes here.
    expect(roomIsFreshEnoughToOffer(null, null, NOW)).toBe(true);
    expect(roomIsFreshEnoughToOffer("not a date", null, NOW)).toBe(true);
  });
});

/**
 * The senders have to actually use it. These are the three screens that share
 * a link, and each one was building the URL by hand.
 */
describe("every screen that shares a link declares its intent", () => {
  it("the invite modal builds its link through inviteLinkPath", () => {
    const modal = src("src/components/team/InviteFriendsModal.tsx");
    expect(modal).toContain('from "@/utils/inviteLink"');
    // No hand-rolled personal link left anywhere in it.
    expect(modal).not.toMatch(/siteUrl\(`\/i\/\$\{/);
    expect(modal).toContain('kind: "friend"');
    expect(modal).toContain('kind: "room"');
  });

  it("Create Room shares a pending link, because its room is not made yet", () => {
    const create = src("src/components/team/CreateRoomPage.tsx");
    expect(create).toContain('from "@/utils/inviteLink"');
    expect(create).toContain('{ kind: "pending" }');
    expect(create).not.toMatch(/siteUrl\(`\/i\/\$\{/);
  });

  it("the invite page reads the intent instead of trusting the guess", () => {
    const page = src("src/pages/InvitePage.tsx");
    expect(page).toContain("readInviteIntent");
    expect(page).toContain("roomIsFreshEnoughToOffer");
    // Signing up mid-invite must not drop it.
    expect(page).toMatch(/returnTo=\$\{encodeURIComponent\(`\/i\/\$\{code\}\$\{search\}`\)\}/);
  });
});
