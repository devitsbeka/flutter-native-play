import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A draft room's invitations wait for Create.
 *
 * A private room is a draft until the host presses Create in the lobby, and
 * backing out alone deletes it (privateRoomIsADraftUntilCreate). Inviting
 * from that lobby wrote the seat immediately — and the `notify_room_invite`
 * trigger rings the in-app bell on that insert, with the push right behind
 * it. So a friend was called to a room that was still being built, before
 * the rounds or the question count existed, and sometimes to one that was
 * then thrown away (owner: "room is ready only after i click create button
 * and we should send invitations after that").
 *
 * While the room is a draft the sheet only PICKS. Create sends.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const sheet = read("src/components/team/InviteFriendsModal.tsx");
const helper = read("src/utils/roomInvites.ts");

describe("while the room is a draft", () => {
  it("the sheet is given no room to write to", () => {
    // Passing roomId is what puts the sheet in send-now mode; a draft gets
    // its pre-room mode instead, which hands the picks back.
    expect(lobby).toMatch(/const invitesWaitForCreate = isHost && !roomCreated;/);
    expect(lobby).toMatch(/\{\.\.\.\(invitesWaitForCreate\s*\n\s*\? \{/);
    expect(lobby).toMatch(/: \{ roomId: currentRoom\.id \}\)\}/);
    expect(lobby).toMatch(/selectedFriends: queuedInvites,/);
  });

  it("the picks are held, and shown as the seats they will become", () => {
    expect(lobby).toMatch(/const \[queuedInvites, setQueuedInvites\] = useState<Set<string>>\(new Set\(\)\);/);
    expect(lobby).toMatch(/const queuedPlayers: LobbyPlayer\[\] = \[\.\.\.queuedInvites\]\.map/);
    expect(lobby).toMatch(/players=\{\[\.\.\.lobbyPlayers, \.\.\.queuedPlayers, \.\.\.departedPlayers\]\}/);
    // Spoken for, so they fill the room's cap like any other invitation.
    expect(lobby).toMatch(/taken: participants\.length \+ queuedPlayers\.length,/);
    // And a pick can be taken back before it is ever sent.
    expect(lobby).toMatch(/onRemove: \(\) =>\s*\n\s*setQueuedInvites\(\(prev\) => \{/);
  });
});

describe("Create sends them", () => {
  it("after the draft settles, and before the host is walked out", () => {
    const handler = lobby.slice(
      lobby.indexOf("const handleDoneCreating = async () => {"),
      lobby.indexOf("const handleCreatePress"),
    );
    const settled = handler.indexOf("if (isPublic === null) return;");
    const send = handler.indexOf("await inviteUsersToRoom({");
    const leave = handler.indexOf("exitRoom();");
    expect(settled).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(settled);
    expect(leave).toBeGreaterThan(send);
    // The room IS created by then, so a failed invitation says what did not
    // happen rather than failing the press.
    expect(handler).toMatch(/console\.error\("\[RoomLobbyV2\] queued invitations failed", err\);/);
  });

  it("and the queue empties, so a second Create cannot send them twice", () => {
    expect(lobby).toMatch(/setQueuedInvites\(new Set\(\)\);/);
  });
});

describe("the seat and the two notifications", () => {
  it("are written in one place, for both callers", () => {
    // They were the invite sheet's alone. The lobby's flush would have been
    // a second copy of a two-table write whose halves must not drift.
    expect(helper).toMatch(/export async function inviteUsersToRoom\(opts: \{/);
    expect(helper).toMatch(/\.from\("room_participants"\)\.insert\(/);
    expect(helper).toMatch(/\.from\("game_invitations"\)/);
    expect(helper).toMatch(/send-game-invite-push/);
    for (const [label, src] of [["the sheet", sheet], ["the lobby", lobby]] as const) {
      expect(src, label).toMatch(/inviteUsersToRoom\(\{/);
      expect(src, label).toMatch(/from "@\/utils\/roomInvites"/);
    }
  });

  it("skip anyone already seated, so nobody is invited twice", () => {
    expect(helper).toMatch(/const toInvite = ids\.filter\(\(id\) => !already\.has\(id\)\);/);
    expect(helper).toMatch(/if \(toInvite\.length === 0\) return \{ invited: \[\] \};/);
  });
});
