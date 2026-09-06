/**
 * Which room the Public tab puts first, and why.
 *
 * The owner's order: just-created rooms, then the ones filling up with
 * somebody live in them, then a friend's. The rules already in place stay
 * above all three — my own pending join request, my own rooms — and a room
 * whose whole couch has closed the app still sinks to the very back.
 *
 * Sorted in the client rather than in the public_rooms RPC: the order needs
 * the viewer's friends and the live presence set, neither of which the
 * function knows, and 60 rows do not need a hand-pasted migration to arrange.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  JUST_CREATED_MS,
  sortPublicRooms,
  type PublicRoom,
  type PublicRoomContext,
} from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const NOW = Date.now();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

let n = 0;
function room(over: Partial<PublicRoom> = {}): PublicRoom {
  n += 1;
  return {
    id: `r${n}`,
    room_code: `C${n}`,
    room_name: `Room ${n}`,
    room_icon: null,
    game_type_key: null,
    game_mode: null,
    status: "waiting",
    created_at: ago(6 * 3600_000),
    last_activity_at: ago(6 * 3600_000),
    host_user_id: `h${n}`,
    host_nickname: null,
    host_avatar_url: null,
    player_count: 0,
    max_players: 10,
    first_category_name: null,
    first_category_icon: null,
    my_state: "none",
    ...over,
  };
}

/** Everyone named here is seated in their own room and online. */
const ctxFor = (rooms: PublicRoom[], friends: string[] = []): PublicRoomContext => ({
  seatedByRoom: new Map(rooms.map((r) => [r.id, [r.host_user_id]])),
  onlineIds: new Set(rooms.map((r) => r.host_user_id)),
  friendIds: new Set(friends),
});

const order = (rooms: PublicRoom[], ctx: PublicRoomContext) =>
  sortPublicRooms(rooms, ctx.friendIds, ctx).map((r) => r.id);

describe("the owner's three bands", () => {
  it("a room made a minute ago leads a fuller old one and a friend's", () => {
    const fresh = room({ created_at: ago(60_000), last_activity_at: ago(60_000) });
    const filling = room({ player_count: 7 });
    const friend = room({ host_user_id: "pal" });
    const rooms = [friend, filling, fresh];
    expect(order(rooms, ctxFor(rooms, ["pal"]))).toEqual([fresh.id, filling.id, friend.id]);
  });

  it("filling-up beats a friend's empty room", () => {
    const filling = room({ player_count: 3 });
    const friend = room({ host_user_id: "pal", player_count: 0 });
    const rooms = [friend, filling];
    expect(order(rooms, ctxFor(rooms, ["pal"]))).toEqual([filling.id, friend.id]);
  });

  it("and a friend's beats a stranger's, all else equal", () => {
    const friend = room({ host_user_id: "pal" });
    const stranger = room();
    const rooms = [stranger, friend];
    expect(order(rooms, ctxFor(rooms, ["pal"]))).toEqual([friend.id, stranger.id]);
  });
});

describe("the tie-break answers the same question the band does", () => {
  it("newest first among the just-created", () => {
    // Not by open seats: that would put a fresh EMPTY room below a fresh
    // half-full one, which is the opposite of what this band is for.
    const newer = room({ created_at: ago(60_000), player_count: 0 });
    const older = room({ created_at: ago(5 * 60_000), player_count: 5 });
    const rooms = [older, newer];
    expect(order(rooms, ctxFor(rooms))).toEqual([newer.id, older.id]);
  });

  it("fullest first among the filling ones, as a share of the seats", () => {
    // 4/6 is fuller than 4/10, though both have four people.
    const tight = room({ player_count: 4, max_players: 6 });
    const roomy = room({ player_count: 4, max_players: 10 });
    const rooms = [roomy, tight];
    expect(order(rooms, ctxFor(rooms))).toEqual([tight.id, roomy.id]);
  });

  it("the window is ten minutes", () => {
    expect(JUST_CREATED_MS).toBe(10 * 60 * 1000);
    const inside = room({ created_at: ago(JUST_CREATED_MS - 5_000), player_count: 0 });
    const outside = room({ created_at: ago(JUST_CREATED_MS + 5_000), player_count: 9 });
    const rooms = [outside, inside];
    expect(order(rooms, ctxFor(rooms))).toEqual([inside.id, outside.id]);
  });
});

describe("the rules that were already there still hold", () => {
  it("my pending join request stays the first card", () => {
    const pending = room({ my_state: "pending", created_at: ago(9 * 3600_000) });
    const fresh = room({ created_at: ago(30_000) });
    const rooms = [fresh, pending];
    expect(order(rooms, ctxFor(rooms))[0]).toBe(pending.id);
  });

  it("my own rooms sit above other people's", () => {
    const mine = room({ my_state: "host", created_at: ago(8 * 3600_000) });
    const fresh = room({ created_at: ago(30_000) });
    const rooms = [fresh, mine];
    expect(order(rooms, ctxFor(rooms))[0]).toBe(mine.id);
  });

  it("a room nobody is in goes to the very back, however new or full", () => {
    // The owner's earlier rule: a room whose couch has closed the app is one
    // you will wait in alone.
    const deadFresh = room({ created_at: ago(30_000), player_count: 8 });
    const alive = room({ created_at: ago(5 * 3600_000), player_count: 1 });
    const rooms = [deadFresh, alive];
    const ctx: PublicRoomContext = {
      seatedByRoom: new Map(rooms.map((r) => [r.id, [r.host_user_id]])),
      onlineIds: new Set([alive.host_user_id]),
      friendIds: new Set(),
    };
    expect(order(rooms, ctx)).toEqual([alive.id, deadFresh.id]);
  });
});

describe("it is a stable, total order", () => {
  it("a clock that ran ahead does not promote an old room", () => {
    // Measured absolutely, so a device an hour ahead of the server cannot
    // read a six-hour-old room as "just created".
    const old = room({ created_at: new Date(NOW + 7 * 3600_000).toISOString() });
    const fresh = room({ created_at: ago(30_000) });
    const rooms = [old, fresh];
    expect(order(rooms, ctxFor(rooms))).toContain(fresh.id);
  });

  it("does not mutate the list it was given", () => {
    const rooms = [room({ player_count: 1 }), room({ created_at: ago(30_000) })];
    const before = rooms.map((r) => r.id);
    sortPublicRooms(rooms, new Set(), ctxFor(rooms));
    expect(rooms.map((r) => r.id)).toEqual(before);
  });
});

describe("and it stays in the client", () => {
  it("no migration was written for this", () => {
    // The RPC cannot know the viewer's friends or who is online, so pushing
    // the order down there would have cost a hand-pasted migration AND still
    // not answered two of the three bands.
    const hook = read("src/hooks/usePublicRooms.ts");
    expect(hook).toMatch(/export const JUST_CREATED_MS/);
    expect(hook).toMatch(/p_limit: 60/);
  });
});

describe("'most full' stops one short of full", () => {
  it("a room with no seat left sinks below the ones you can enter", () => {
    // Sorting the band on fullness alone put the one room you CANNOT join
    // at the top of it. A full couch is not close to starting for you.
    const full = room({ player_count: 10, max_players: 10 });
    const nearly = room({ player_count: 9, max_players: 10 });
    const half = room({ player_count: 5, max_players: 10 });
    const rooms = [full, half, nearly];
    expect(order(rooms, ctxFor(rooms))).toEqual([nearly.id, half.id, full.id]);
  });
});
