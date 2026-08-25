import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  inviteLinkPath,
  readInviteIntent,
  roomIsFreshEnoughToOffer,
  senderCanOfferRoom,
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

  /**
   * A share sheet hands the messaging app a title, a message and a URL as
   * three separate fields, and what it does with them is its own business.
   * Pick "Copy" on the macOS sheet and the clipboard holds the URL and the
   * message run together; paste that into a browser and every space becomes
   * %20. The link that arrived from a REAL "add friend" share was
   *
   *   /i/g6krdvgpx4zqm4n3?f=1%20მოგიწვიე%20MyTrivia-ში%20თამაშზე!…
   *
   * An exact `=== "1"` says that link carries no intent, and the friend
   * request quietly becomes an invitation to a room again.
   */
  it("keeps the intent when a chat app glues its message onto the link", () => {
    expect(readInviteIntent("?f=1 მოგიწვიე MyTrivia-ში თამაშზე! შემომიერთდი")).toEqual({
      kind: "friend",
    });
    expect(readInviteIntent("?f=1%20Join%20me")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?r=XY7Q2B Come and play")).toEqual({
      kind: "room",
      roomCode: "XY7Q2B",
    });
  });

  it("survives a round trip through the URL", () => {
    // A real room code: six characters of ABCDEFGHJKLMNPQRSTUVWXYZ23456789,
    // which is why stopping at the first space above costs nothing. This
    // assertion used to use a code with a space in it to prove the encoding
    // worked, which no room has ever had.
    const link = inviteLinkPath("abc123", { kind: "room", roomCode: "XY7Q2B" });
    const query = link.slice(link.indexOf("?"));
    expect(readInviteIntent(query)).toEqual({ kind: "room", roomCode: "XY7Q2B" });
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
 * Whose room a link that names no room is allowed to offer.
 *
 * invite_preview settles for "a waiting room the sender is a PARTICIPANT of",
 * and participation is not an invitation to give. Gloria opened a link she
 * had shared from Create Room — nothing made yet, no room named — and got
 * "Celebration Plaza", hosted by TriviaMaste, because she had joined it an
 * hour earlier. The screen read "Gloria is inviting you to play" over
 * somebody else's lobby.
 */
describe("whether a late-resolved room is the sender's to offer", () => {
  const GLORIA = "gloria-id";
  const TRIVIAMASTE = "triviamaste-id";

  it("offers a room the sender hosts", () => {
    expect(senderCanOfferRoom(GLORIA, GLORIA)).toBe(true);
  });

  it("does not offer a room the sender merely joined", () => {
    expect(senderCanOfferRoom(TRIVIAMASTE, GLORIA)).toBe(false);
  });

  it("offers nothing when either side is unknown", () => {
    expect(senderCanOfferRoom(null, GLORIA)).toBe(false);
    expect(senderCanOfferRoom(GLORIA, undefined)).toBe(false);
    expect(senderCanOfferRoom(undefined, undefined)).toBe(false);
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
    expect(page).toContain("senderCanOfferRoom");
    // Signing up mid-invite must not drop it.
    expect(page).toMatch(/returnTo=\$\{encodeURIComponent\(`\/i\/\$\{code\}\$\{search\}`\)\}/);
  });
});
