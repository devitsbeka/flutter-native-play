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

/** The InvitePlayerButton component, on its own. */
function inviteButtonSource(): string {
  const m = scoreboard.match(/function InvitePlayerButton\([\s\S]*?\n\}\n\n\/\*\*/);
  expect(m, "expected InvitePlayerButton").not.toBeNull();
  return m![0];
}

/** The PresenceAvatar component, on its own. */
function presenceAvatarSource(): string {
  const m = scoreboard.match(/function PresenceAvatar\([\s\S]*?\n\}\n\nexport function RoomScoreboard/);
  expect(m, "expected PresenceAvatar").not.toBeNull();
  return m![0];
}

describe("the invite button beside a player", () => {
  it("sits with the name, not out in the score column", () => {
    // The score column is about the game; this is about the person.
    expect(scoreboard).toMatch(/<InvitePlayerButton\s+userId=\{p\.user_id\}/);
  });

  it("is the icon alone on a phone", () => {
    // The row already carries a rank, an avatar, a name, an add-friend
    // button and a score. A word on top of that spends the name's width on
    // something the paper-plane already says.
    // Two places, not three: the VS layout used to be two hand-copied
    // columns and is now one component drawn twice.
    const uses = scoreboard.match(/<InvitePlayerButton[\s\S]{0,400}?\/>/g) ?? [];
    expect(uses.length, "expected the ranked list row and VsPlayer").toBe(2);
    for (const use of uses) {
      expect(use, "every invite button must narrow itself on a phone")
        .toMatch(/iconOnly=\{isMobile\}/);
    }
    expect(scoreboard, "the width has to come from the same hook the rest of the app uses")
      .toMatch(/const isMobile = useIsMobile\(\);/);
  });

  it("drops the label rather than squeezing it into the circle", () => {
    const button = inviteButtonSource();
    expect(button).toMatch(/\{!iconOnly && !showSent && t\("extra\.inviteFriendBtn"\)\}/);
    expect(button, "a circle for the icon, a pill for the word")
      .toMatch(/iconOnly \? "h-7 w-7 rounded-full"/);
  });

  it("keeps the word for a screen reader either way", () => {
    // Dropping the label from the pixels must not drop it from the button.
    const button = inviteButtonSource();
    expect(button).toMatch(/aria-label=\{t\("extra\.inviteFriendBtn"\)\}/);
  });

  it("is the host's button only", () => {
    const guards = scoreboard.match(/\{isHost && [^}]*onInvitePlayer[^}]*&& \(/g) ?? [];
    expect(
      guards.length,
      "expected the guard on the ranked list row and in VsPlayer"
    ).toBe(2);
    for (const guard of guards) {
      expect(guard, "a player must not be offered a button to invite themselves")
        .toMatch(/user_id !== currentUserId/);
    }
  });

  it("does not appear against a placeholder who never arrived", () => {
    // That row already has its own Send button, which means something else.
    expect(scoreboard).toMatch(/\{isHost && !isInvited && onInvitePlayer/);
  });

  it("says მოწვევა, and claims nothing afterwards", () => {
    // The "sent" caption is gone on purpose. It announced the outcome the
    // instant the notification row was written and then sat there unchanged
    // whether the player ever turned up or not; the green ring on their
    // avatar is the honest version of the same signal.
    const button = inviteButtonSource();
    expect(button).toMatch(/t\("extra\.inviteFriendBtn"\)/);
    expect(button, "a sent caption outlives the fact it claims")
      .not.toMatch(/t\("extra\.sentLabel"\)/);
  });

  it("stays pressable when the invite fails", () => {
    // Going green on a notification that was never written is worse than
    // doing nothing: the host would stop waiting for someone who was never
    // asked.
    const button = inviteButtonSource();
    expect(button).toMatch(/catch \{/);
    expect(button, "setSent must not run on the failure path")
      .toMatch(/await onInvite\(userId\);\s*\n\s*setSent\(true\);/);
  });
});

/**
 * The crown moved off the name and onto the face.
 *
 * It used to trail the nickname, in the same strip of row as the add-friend
 * button and now the invite button — three things competing for the space the
 * name needed, so a long nickname went to an ellipsis to make room for them.
 * On the corner of the avatar it belongs to the person rather than to the
 * text, which is where the room cards have always drawn it.
 */
describe("the host's crown", () => {
  it("sits on the avatar", () => {
    const avatar = presenceAvatarSource();
    expect(avatar, "the crown must be positioned against the avatar")
      .toMatch(/absolute -bottom-1 -left-1/);
    expect(avatar).toMatch(/src=\{crownIcon\}/);
    expect(avatar, "an absolute child needs a positioned parent or it escapes to the row")
      .toMatch(/className=\{`relative flex-shrink-0/);
  });

  it("is the same crown the room cards draw", () => {
    // Two different crowns for one role is how a room card and its lobby
    // stop looking like the same app.
    expect(scoreboard).toMatch(/import crownIcon from "@\/assets\/crown-icon\.png"/);
  });

  it("no longer trails the nickname", () => {
    // The whole point of moving it. A lucide Crown left in the name group
    // would put two crowns on the host.
    const nameGroup = scoreboard.match(
      /\{isInvited && \(\s*<span className="text-xs text-white\/40 italic">[\s\S]*?<\/div>/
    );
    expect(nameGroup, "expected the name group").not.toBeNull();
    expect(nameGroup![0], "the crown belongs to the avatar now, not the name")
      .not.toMatch(/<Crown/);
  });

  it("still stands down for a placeholder who never arrived", () => {
    expect(scoreboard).toMatch(/crown=\{showHostCrown && p\.is_host && !isInvited\}/);
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

  it("is wired into the lobby's player rows", () => {
    // The universal lobby's rows carry the two nudges the scoreboard's
    // paper-plane used to: "come and play" to a seated player, and the
    // invitation again to a placeholder who never arrived. Host-side only.
    expect(lobby).toMatch(/isHost && p\.user_id !== user\?\.id/);
    expect(lobby).toMatch(/handleInvitePlayer\(p\.user_id\)/);
    expect(lobby).toMatch(/handleResendInvitation\(p\.user_id\)/);
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
