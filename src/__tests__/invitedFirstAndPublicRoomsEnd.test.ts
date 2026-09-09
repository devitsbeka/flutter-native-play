/**
 * Two things about rooms, from one screenshot (owner's ask).
 *
 * An invitation is the first card on both tabs. It sorted under a room
 * that could be played right now, so a player scrolling past their friends'
 * rooms could miss the one somebody was waiting on them in ("show rooms
 * with invitation first to see and don't lose in scroll").
 *
 * And a public room is made for one play. Its match ends on the results
 * screen; the only way it goes on is a rematch, asked there. So the host's
 * back arrow closes it — cancelled and archived, which every listing hides
 * and which sends the guests out — and a guest's back gives up their seat.
 * A private room keeps its old back: the lobby, with the room waiting
 * ("hosts are creating public rooms for one play ... several matches until
 * players in room are accepting re-matches").
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

describe("a public room ends with its match", () => {
  const back = results.slice(results.indexOf("const handleBackToRoom"), results.indexOf("// Get next queue item for display"));

  it("a private room's back is still the lobby", () => {
    expect(back).toMatch(/if \(!isPublicRoom \|\| !currentRoom\) \{\s*\n\s*continueInRoom\(\);\s*\n\s*return;/);
  });

  it("the host's back closes a public room — cancelled and archived — and leaves", () => {
    expect(back).toMatch(/\.update\(\{ status: "cancelled", is_archived: true \}\)/);
    expect(back).toMatch(/exitRoom\(\);\s*\n\s*navigate\("\/team\?tab=public", \{ replace: true \}\);/);
  });

  it("a guest's back gives up the seat", () => {
    expect(back).toMatch(/void leaveRoomPermanently\(\);\s*\n\s*navigate\("\/team\?tab=public", \{ replace: true \}\);/);
  });

  it("every listing already hides a cancelled or archived room", () => {
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/\.neq\("status", "cancelled"\)/);
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/is_archived\.is\.null,is_archived\.eq\.false/);
    const sql = read("supabase/migrations/20261013100000_retire_untouched_rooms.sql");
    expect(sql).toMatch(/r\.status::text IN \('waiting', 'playing'\)/);
  });
});
