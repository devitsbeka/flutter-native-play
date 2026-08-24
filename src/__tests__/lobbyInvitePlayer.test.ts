import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Calling people back to a room they already belong to.
 *
 * A room's roster outlives any one evening — everyone who ever played there
 * is still on the scoreboard — but the only two ways to reach any of them
 * were the `+` in the header, which invites somebody NEW, and the green Send
 * button, which belongs to a placeholder who never arrived. For the six
 * people who had played there fifteen times, the host had no way to say
 * "we're playing now" without leaving the room to find them elsewhere.
 *
 * Each of them now has მოწვევა beside their name, host-side only.
 */
const scoreboard = readFileSync(
  join(process.cwd(), "src/components/team/RoomScoreboard.tsx"),
  "utf8"
);
const lobby = readFileSync(
  join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"),
  "utf8"
);

describe("the invite button beside a player", () => {
  it("sits with the name, not out in the score column", () => {
    // The score column is about the game; this is about the person.
    expect(scoreboard).toMatch(/<InvitePlayerButton userId=\{p\.user_id\} onInvite=\{onInvitePlayer\} \/>/);
  });

  it("is the host's button only", () => {
    const guards = scoreboard.match(/\{isHost && [^}]*onInvitePlayer[^}]*&& \(/g) ?? [];
    expect(
      guards.length,
      "expected the guard on the list and on both halves of the VS layout"
    ).toBe(3);
    for (const guard of guards) {
      expect(guard, "a player must not be offered a button to invite themselves")
        .toMatch(/user_id !== currentUserId/);
    }
  });

  it("does not appear against a placeholder who never arrived", () => {
    // That row already has its own Send button, which means something else.
    expect(scoreboard).toMatch(/\{isHost && !isInvited && onInvitePlayer/);
  });

  it("says მოწვევა, and says sent afterwards", () => {
    const button = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\nexport function RoomScoreboard/);
    expect(button, "expected InvitePlayerButton").not.toBeNull();
    expect(button![0]).toMatch(/t\("extra\.inviteFriendBtn"\)/);
    expect(button![0]).toMatch(/t\("extra\.sentLabel"\)/);
  });

  it("stays pressable when the invite fails", () => {
    // Going green on a notification that was never written is worse than
    // doing nothing: the host would stop waiting for someone who was never
    // asked.
    const button = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\nexport function RoomScoreboard/)![0];
    expect(button).toMatch(/catch \{/);
    expect(button, "setSent must not run on the failure path")
      .toMatch(/await onInvite\(userId\);\s*\n\s*setSent\(true\);/);
  });
});

describe("what the host's invite sends", () => {
  it("writes the notification itself", () => {
    // notify_room_invite fires on a NEW room_participants row. Both people
    // this reaches already have one, so nothing would fire on its own.
    const fn = lobby.match(/const sendRoomInvite = async[\s\S]*?\n {2}\};/);
    expect(fn, "expected the shared invite writer").not.toBeNull();
    expect(fn![0]).toMatch(/type: "room_invite"/);
    expect(fn![0]).toMatch(/room_id: currentRoom\.id/);
  });

  it("does not call it a resend", () => {
    // Nothing was pending for a player already on the scoreboard.
    const fn = lobby.match(/const handleInvitePlayer = async[\s\S]*?\n {2}\};/);
    expect(fn, "expected handleInvitePlayer").not.toBeNull();
    expect(fn![0]).toMatch(/t\("extra\.inviteSent"\)/);
    expect(fn![0], "invitationResent belongs to the placeholder's button")
      .not.toMatch(/invitationResent/);
  });

  it("reports failure to the button as well as the toast", () => {
    const fn = lobby.match(/const handleInvitePlayer = async[\s\S]*?\n {2}\};/)![0];
    expect(fn, "swallowing the error would turn the button green on a failed invite")
      .toMatch(/throw error;/);
  });

  it("is wired into the scoreboard", () => {
    expect(lobby).toMatch(/onInvitePlayer=\{handleInvitePlayer\}/);
  });
});

/**
 * The non-host's button in the lobby asked the host to come and start. It
 * still does exactly that — only the wording changed, because "call the host"
 * described a summons and what it actually sends is an invitation.
 */
describe("the button a non-host sees", () => {
  it("invites the host rather than calling them", () => {
    const ka = readFileSync(join(process.cwd(), "src/locales/ka.ts"), "utf8");
    expect(ka).toMatch(/pingHostBtn: "მოიწვიე ჰოსტი"/);
  });

  it("is reworded in every language, not only Georgian", () => {
    // Leaving the others at "call the host" would have made one app say two
    // different things depending on who opened it.
    for (const locale of ["en", "de", "es", "fr", "it", "pt"]) {
      const file = readFileSync(join(process.cwd(), `src/locales/${locale}.ts`), "utf8");
      const value = file.match(/pingHostBtn: "([^"]*)"/);
      expect(value, `pingHostBtn is missing from ${locale}`).not.toBeNull();
      expect(
        value![1].toLowerCase(),
        `${locale} still asks the host to be called, not invited`
      ).toMatch(/invit|einladen|convidar/);
    }
  });
});
