/**
 * An ended public room is not on the Public tab.
 *
 * Every path that ends a round hands the room back to "waiting" — that is
 * how the lobby is reached again — and a public room in "waiting" is
 * listed. So a room that had just been played sat on the Public tab like
 * an open game, and whoever walked in found an empty, locked lobby with
 * nothing to play. Owner: "after game ends we show ended public game room
 * in list and when players re-enter they see empty room with no ability to
 * be modified so they can play in that room, remove and don't show ended
 * games room on public list, leave in private though".
 *
 * Three things:
 *  - the Public tab hides a waiting room that has been played (its
 *    activity stamp is past its creation) and has nothing to play — the
 *    Private tab, which lists by participation, is untouched;
 *  - a stale public room is closed on rejoin rather than revived into the
 *    list as an empty lobby;
 *  - and the published-room lock lifts while there is nothing to play, so
 *    a host who does come back can set the next game.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filterPublicRooms, isEndedPublicRoom, type PublicRoom } from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

const now = Date.parse("2026-09-09T12:00:00Z");
const at = (ms: number) => new Date(now + ms).toISOString();
const room = (over: Partial<PublicRoom> = {}): PublicRoom => ({
  id: "r",
  room_code: "CODE",
  room_name: "A room",
  room_icon: null,
  game_type_key: null,
  game_mode: null,
  status: "waiting",
  created_at: at(-30 * 60_000),
  last_activity_at: at(-30 * 60_000),
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

describe("isEndedPublicRoom", () => {
  it("a waiting room, played (activity past creation), nothing to play: ended", () => {
    expect(isEndedPublicRoom(room({ last_activity_at: at(-5 * 60_000) }))).toBe(true);
  });

  it("a fresh room the host is still building is not — its activity is its creation", () => {
    expect(isEndedPublicRoom(room())).toBe(false);
    expect(isEndedPublicRoom(room({ last_activity_at: null }))).toBe(false);
  });

  it("a room with something to play is a rematch, and stays", () => {
    expect(isEndedPublicRoom(room({ last_activity_at: at(-5 * 60_000), first_category_name: "History" }))).toBe(false);
  });

  it("a room mid-round is not ended, whatever the stamps say", () => {
    expect(isEndedPublicRoom(room({ status: "playing", last_activity_at: at(-5 * 60_000) }))).toBe(false);
  });
});

describe("the Public tab", () => {
  it("drops an ended room and keeps the ones beside it", () => {
    const ended = room({ id: "ended", last_activity_at: at(-5 * 60_000) });
    const fresh = room({ id: "fresh" });
    const rematch = room({ id: "rematch", last_activity_at: at(-5 * 60_000), first_category_name: "Movies" });
    const ids = filterPublicRooms([ended, fresh, rematch], "all", "").map((r) => r.id);
    expect(ids).toEqual(["fresh", "rematch"]);
  });

  it("the Private tab does not use this rule — it hides only what is OVER (publicRoomsEnd.test.ts)", () => {
    // Ended is "nothing to play right now"; the host's own list keeps such
    // a room until an hour has passed with nobody back for a rematch.
    expect(read("src/hooks/useMyRooms.ts")).not.toMatch(/isEndedPublicRoom/);
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/isPublicRoomOver/);
  });
});

describe("a stale public room is closed, not revived", () => {
  it("on rejoin, before the reset-to-lobby the private rooms keep", () => {
    const at1 = ctx.indexOf('&& room.is_public) {');
    const at2 = ctx.indexOf('resetting to lobby');
    expect(at1).toBeGreaterThan(-1);
    expect(at1).toBeLessThan(at2);
    expect(ctx).toMatch(/\.update\(\{ status: "cancelled", is_archived: true \}\)\s*\n\s*\.eq\("id", room\.id\);\s*\n\s*toast\.error\(tStandalone\("extra\.mpRoomIsClosed"\)\);\s*\n\s*return false;/);
  });
});

describe("the lock lifts when there is nothing to play", () => {
  it("so the host of a played-out public room can set the next game", () => {
    expect(lobby).toMatch(/const publishedRoom = isPublicRoom && roomCreated && !needsCategorySelection;/);
  });
});
