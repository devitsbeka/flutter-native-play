/**
 * Two things about rooms, from one screenshot (owner's ask).
 *
 * An invitation is the first card on both tabs. It sorted under a room
 * that could be played right now, so a player scrolling past their friends'
 * rooms could miss the one somebody was waiting on them in ("show rooms
 * with invitation first to see and don't lose in scroll").
 *
 * And a public room is public once. It was read first as "made for one
 * play": the host's back arrow off the results screen closed it, a
 * guest's gave up the seat. The rule is finer now (publicRoomIsPublicOnce
 * .test.ts): the first round turns the room private, and from then on it
 * is the players' own — they keep playing in it, nothing lists it again,
 * and back is the lobby for everyone, as it always was for a private room.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareRooms } from "@/utils/roomOrder";
import { sortPublicRooms, type PublicRoom } from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");

const room = (over: Partial<PublicRoom> = {}): PublicRoom => ({
  id: "r",
  room_code: "CODE",
  room_name: "A room",
  room_icon: null,
  game_type_key: null,
  game_mode: null,
  status: "waiting",
  created_at: new Date().toISOString(),
  last_activity_at: null,
  host_user_id: "h",
  host_nickname: "Host",
  host_avatar_url: null,
  player_count: 2,
  max_players: 10,
  first_category_name: null,
  first_category_icon: null,
  my_state: "none",
  rounds: [],
  total_questions: 10,
  ...over,
});

describe("an invitation is the first card", () => {
  it("on the private list, above a room that can be played right now", () => {
    const playable = { created_at: "2026-09-09T00:00:00Z", hasFullRoster: true };
    const invited = { created_at: "2020-01-01T00:00:00Z", hasPendingInvite: true };
    expect(compareRooms(invited, playable)).toBeLessThan(0);
    expect(compareRooms(playable, invited)).toBeGreaterThan(0);
  });

  it("on the public list, above my own pending ask and everything else", () => {
    const ctx = {
      seatedByRoom: new Map<string, string[]>([["invited", ["h", "me"]], ["mine", ["h2"]], ["asked", ["h3"]]]),
      onlineIds: new Set(["h", "h2", "h3"]),
      friendIds: new Set<string>(),
      invitedIds: new Set(["invited"]),
    };
    const sorted = sortPublicRooms(
      [
        room({ id: "mine", host_user_id: "h2", my_state: "host" }),
        room({ id: "asked", host_user_id: "h3", my_state: "pending" }),
        room({ id: "invited", host_user_id: "h", my_state: "joined", created_at: "2020-01-01T00:00:00Z" }),
      ],
      ctx.friendIds,
      ctx,
    );
    expect(sorted.map((r) => r.id)[0]).toBe("invited");
  });

  it("the public tab hands its sort the invites it already reads", () => {
    expect(pub).toMatch(/invitedIds: new Set\(pendingInvites\.keys\(\)\),/);
  });
});

describe("a played public room is the players' own", () => {
  const back = results.slice(results.indexOf("const handleBackToRoom"), results.indexOf("// Get next queue item for display"));

  it("back is the lobby for everyone — the room is a private one by then", () => {
    expect(back).toMatch(/const handleBackToRoom = \(\) => \{\s*\n\s*continueInRoom\(\);\s*\n\s*\};/);
    expect(back).not.toMatch(/status: "cancelled"/);
    expect(back).not.toMatch(/leaveRoomPermanently/);
  });

  it("every listing hides a cancelled or archived room, for the rooms the sweep closes", () => {
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/\.neq\("status", "cancelled"\)/);
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/is_archived\.is\.null,is_archived\.eq\.false/);
    const sql = read("supabase/migrations/20261013100000_retire_untouched_rooms.sql");
    expect(sql).toMatch(/r\.status::text IN \('waiting', 'playing'\)/);
  });
});
