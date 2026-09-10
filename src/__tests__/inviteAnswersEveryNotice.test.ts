/**
 * Answering an invite answers every notice of it, at once, and says so.
 *
 * A host who taps "invite" twice, or "invite back" from a player's row,
 * writes a fresh room_invite notification each time. The card keyed the
 * invite by room and answered ONE notification — so with two unread, a
 * tap on Confirm or X retired the first and the card went on asking on
 * the second, however many times it was answered (owner: "i can't click
 * cancel and when i click confirm sometimes i still see it, feels like it
 * never disappears").
 *
 * Three fixes, both tabs:
 *  - the invite carries every unread notice for its room, and Confirm and
 *    X answer all of them;
 *  - the context's own copies are marked read on the spot — Confirm used
 *    to leave that to the realtime echo, which is "sometimes";
 *  - the card is busy while the decline writes (three rows, written
 *    together rather than one after the next), so the tap is seen to land.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pendingRoomInvites } from "@/utils/pendingRoomInvites";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const reader = read("src/utils/pendingRoomInvites.ts");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");

const invite = (id: string, room: string, read_at: string | null = null) => ({
  id,
  type: "room_invite",
  read_at,
  data: { room_id: room, sender_nickname: "Host", sender_avatar: null },
});

describe("one invite per room, every notice of it", () => {
  it("collects every unread notification for the room", () => {
    const map = pendingRoomInvites([invite("n1", "r1"), invite("n2", "r1"), invite("n3", "r2"), invite("n4", "r1", "2026-01-01")]);
    expect(map.get("r1")?.notificationId).toBe("n1");
    expect(map.get("r1")?.notificationIds).toEqual(["n1", "n2"]);
    expect(map.get("r2")?.notificationIds).toEqual(["n3"]);
  });

  it("a read one is not an invite", () => {
    expect(pendingRoomInvites([invite("n1", "r1", "2026-01-01")]).size).toBe(0);
  });
});

describe("Confirm and X answer all of them", () => {
  it("accept marks each accepted; decline marks each declined after the three writes, together", () => {
    expect(reader).toMatch(/export function acceptRoomInvite\(notificationIds: readonly string\[\]\): void/);
    expect(reader).toMatch(/for \(const id of notificationIds\)/);
    expect(reader).toMatch(/await Promise\.all\(\[\s*\n\s*supabase\.from\("room_participants"\)\.delete\(\)/);
    expect(reader).toMatch(/await Promise\.all\(notificationIds\.map\(\(id\) => markNotificationActioned\(id, "declined"\)\)\);/);
  });

  it("both tabs retire the context's copies on the spot, on Confirm as well as X", () => {
    expect(pub).toMatch(/onInviteAnswered\(inviteFrom\.notificationIds\);/);
    expect(pub).toMatch(/onInviteAnswered=\{\(ids\) => void markManyAsRead\(\[\.\.\.ids\]\)\}/);
    expect(pub).toMatch(/void markManyAsRead\(invite\.notificationIds\);/);
    expect(mine).toMatch(/acceptRoomInvite\(room\.pending_invite_from\.notificationIds\);\s*\n(\s*\/\/[^\n]*\n)*\s*void markManyAsRead\(room\.pending_invite_from\.notificationIds\);/);
    expect(mine).toMatch(/void markManyAsRead\(room\.pending_invite_from\.notificationIds\);\s*\n\s*toast\.success/);
    for (const src of [pub, mine]) expect(src).not.toMatch(/\bmarkAsRead\(/);
  });

  it("and the card is busy while the decline writes", () => {
    expect(pub).toMatch(/setBusyId\(room\.id\);\s*\n\s*try \{\s*\n\s*await declineRoomInvite/);
    expect(pub).toMatch(/await declineRoomInvite[\s\S]*?\} finally \{\s*\n\s*setBusyId\(null\);/);
    expect(mine).toMatch(/setJoiningRoomId\(room\.id\);\s*\n\s*try \{\s*\n\s*await declineRoomInvite/);
    expect(mine).toMatch(/await declineRoomInvite[\s\S]*?\} finally \{\s*\n\s*setJoiningRoomId\(null\);/);
  });
});
