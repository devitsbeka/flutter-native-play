/**
 * A removed seat is gone at once, on the host's screen and everyone's, and
 * the lobby's invite reaches a phone that is not in the app.
 *
 * Realtime does not carry a DELETE on room_participants to a filtered
 * channel (removedSeatLeavesEveryScreen.test.ts), and the device still
 * needed a refresh (owner: "needs refresh to delete player"). So the host
 * re-reads their own seats right after the removal, and stamps the room
 * row — an UPDATE, which every device's filtered channel does hear — and
 * every device re-reads its seats on any room update.
 *
 * And the paper plane's invite rides a game_invitations row through the
 * DEPLOYED send-game-invite-push, which composes its own words server-side
 * — a push without an edge-function change (owner: "can we add send invite
 * notification without asking lovable in chat?").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("removing a seat", () => {
  it("re-reads the host's seats and stamps the room", () => {
    const fn = lobby.slice(lobby.indexOf("const handleRemovePlayer = async"), lobby.indexOf("};", lobby.indexOf("const handleRemovePlayer = async")));
    expect(fn).toMatch(/if \(error\) throw error;\s*\n(\s*\/\/[^\n]*\n)*\s*await refreshParticipants\(\);/);
    expect(fn).toMatch(/\.from\("game_rooms"\)\s*\n\s*\.update\(\{ last_activity_at: new Date\(\)\.toISOString\(\) \}\)\s*\n\s*\.eq\("id", currentRoom\.id\);/);
  });

  it("and every device re-reads its seats on a room update", () => {
    expect(ctx).toMatch(/setState\(prev => \(\{ \.\.\.prev, currentRoom: updated \}\)\);\s*\n(\s*\/\/[^\n]*\n)*\s*debouncedFetchParticipants\(roomId\);/);
    expect(ctx).toMatch(/refreshParticipants: \(\) => Promise<void>;/);
    expect(ctx).toMatch(/const refreshParticipants = useCallback\(async \(\) => \{\s*\n\s*const id = currentRoomRef\.current\?\.id;\s*\n\s*if \(id\) await fetchParticipants\(id\);/);
  });
});

describe("the lobby's invite", () => {
  it("rides a game_invitations row through the deployed push function", () => {
    const fn = lobby.match(/const sendRoomInvite = async[\s\S]*?\n {2}\};/)![0];
    expect(fn).toMatch(/\.from\("game_invitations"\)\s*\n\s*\.insert\(\{ sender_id: user\.id, receiver_id: userId, room_id: currentRoom\.id \}\)/);
    expect(fn).toMatch(/supabase\.functions\.invoke\("send-game-invite-push", \{ body: \{ invitationId: inv\.id \} \}\)/);
    // Fire-and-forget: the notification is already written either way.
    expect(fn).toMatch(/\.catch\(\(e\) => console\.warn\("\[lobby\] invite push failed:", e\)\);/);
  });
});
