import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { cleanInviteCode, inviteLinkPath, readInviteIntent } from "@/utils/inviteLink";

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

  it("sends a friend request from Create Room, whose room does not exist yet", () => {
    // This used to be a bare link that resolved a room when it was OPENED,
    // and what it found was the room the host made two hours ago.
    expect(inviteLinkPath("abc123", { kind: "friend" })).toBe("/i/abc123?f=1");
  });

  it("reads each of them back", () => {
    expect(readInviteIntent("?f=1")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?r=XY7Q2B")).toEqual({ kind: "room", roomCode: "XY7Q2B" });
  });

  it("falls back to a friend request, never to a guessed room", () => {
    // Links already sitting in people's chat histories carry no marker, and
    // a chat app can strip one past recognition. Every one of these can still
    // honestly deliver a friendship, and none of them can name a room.
    expect(readInviteIntent("")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?utm_source=whatsapp")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?f=0")).toEqual({ kind: "friend" });
    expect(readInviteIntent("?r=")).toEqual({ kind: "friend" });
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

  /**
   * The same mangling, one field to the left. The real link from the report
   * was
   *
   *   /i/g6krdvgpx4zqm4n3%20Trivia%20-%20მოდი%20ითამაშე%20ჩვენთან%20ერთად!
   *
   * so the CODE was "g6krdvgpx4zqm4n3 Trivia - მოდი…", which matches no row —
   * and the person who had just been invited was told their invitation was no
   * longer valid.
   */
  it("recovers the code when the message lands on the path", () => {
    expect(cleanInviteCode("g6krdvgpx4zqm4n3 Trivia - მოდი ითამაშე")).toBe("g6krdvgpx4zqm4n3");
    expect(cleanInviteCode("g6krdvgpx4zqm4n3")).toBe("g6krdvgpx4zqm4n3");
    expect(cleanInviteCode("XY7Q2B!")).toBe("XY7Q2B");
    expect(cleanInviteCode(undefined)).toBeUndefined();
    expect(cleanInviteCode("  ")).toBeUndefined();
    expect(cleanInviteCode("- მოდი")).toBeUndefined();
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

  it("Create Room shares a friend request, because its room is not made yet", () => {
    const create = src("src/components/team/CreateRoomPage.tsx");
    expect(create).toContain('from "@/utils/inviteLink"');
    expect(create).toContain('{ kind: "friend" }');
    expect(create).not.toMatch(/siteUrl\(`\/i\/\$\{/);
  });

  it("the invite page reads the intent instead of trusting the guess", () => {
    const page = src("src/pages/InvitePage.tsx");
    expect(page).toContain("readInviteIntent");
    // The code is scrubbed before anything is looked up with it.
    expect(page).toContain("cleanInviteCode");
    // Signing up mid-invite must not drop it.
    expect(page).toMatch(/returnTo=\$\{encodeURIComponent\(`\/i\/\$\{code\}\$\{search\}`\)\}/);
  });
});
