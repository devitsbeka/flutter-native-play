/**
 * The room you just made: findable, first, and fillable — for ten minutes.
 *
 * You can create a room without meaning to. Tap a game on the chooser, back
 * out before inviting anyone or picking a category, and the room is written.
 * Press back and it is one card among many, with nothing to say it is yours
 * and no way to fill it without entering it first.
 *
 * Three answers, one condition between them:
 *  - it leads the list;
 *  - it wears a turning gradient ring, so you can pick it out;
 *  - its seats row carries a "+" that opens the invite sheet in place.
 *
 * And one rule against all three: ten minutes. If nobody has come by then it
 * stops leading — other rooms are better cards than an empty one nobody came
 * to — and the ring goes with it. A week of that and it stops being listed at
 * all (migration 20261013100000).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  JUST_CREATED_MS,
  isFreshOwnRoom,
  sortPublicRooms,
  type PublicRoom,
  type PublicRoomContext,
} from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const section = read("src/components/team/PublicRoomsSection.tsx");
const css = read("src/index.css");
const sql = read("supabase/migrations/20261013100000_retire_untouched_rooms.sql");

const NOW = Date.now();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

let n = 0;
function room(over: Partial<PublicRoom> = {}): PublicRoom {
  n += 1;
  return {
    id: `r${n}`, room_code: `C${n}`, room_name: `Room ${n}`, room_icon: null,
    game_type_key: null, game_mode: null, status: "waiting",
    created_at: ago(6 * 3600_000), last_activity_at: ago(6 * 3600_000),
    host_user_id: `h${n}`, host_nickname: null, host_avatar_url: null,
    player_count: 0, max_players: 10,
    first_category_name: null, first_category_icon: null,
    my_state: "none",
    ...over,
  };
}
const ctxFor = (rooms: PublicRoom[]): PublicRoomContext => ({
  seatedByRoom: new Map(rooms.map((r) => [r.id, [r.host_user_id]])),
  onlineIds: new Set(rooms.map((r) => r.host_user_id)),
  friendIds: new Set(),
});
const order = (rooms: PublicRoom[]) =>
  sortPublicRooms(rooms, new Set(), ctxFor(rooms)).map((r) => r.id);

describe("what counts as the room I just made", () => {
  it("mine, minutes old, however it was left", () => {
    expect(isFreshOwnRoom(room({ my_state: "host", created_at: ago(60_000), last_activity_at: ago(60_000) }))).toBe(true);
  });

  it("not somebody else's, however new", () => {
    // The ring says "yours". A stranger's fresh room has its own band.
    expect(isFreshOwnRoom(room({ my_state: "none", created_at: ago(60_000), last_activity_at: ago(60_000) }))).toBe(false);
    expect(isFreshOwnRoom(room({ my_state: "joined", created_at: ago(60_000), last_activity_at: ago(60_000) }))).toBe(false);
  });

  it("and not once it has gone quiet for ten minutes", () => {
    expect(JUST_CREATED_MS).toBe(10 * 60 * 1000);
    const cold = room({ my_state: "host", created_at: ago(JUST_CREATED_MS + 5_000), last_activity_at: ago(JUST_CREATED_MS + 5_000) });
    expect(isFreshOwnRoom(cold)).toBe(false);
  });

  it("measured absolutely, so a fast clock cannot pin a room forever", () => {
    const fromTheFuture = room({ my_state: "host", last_activity_at: new Date(NOW + 3 * 3600_000).toISOString() });
    expect(isFreshOwnRoom(fromTheFuture)).toBe(false);
  });

  it("activity keeps it warm — the clock runs from the last thing that happened", () => {
    const busy = room({ my_state: "host", created_at: ago(3 * 3600_000), last_activity_at: ago(30_000) });
    expect(isFreshOwnRoom(busy)).toBe(true);
  });
});

describe("it leads the list, then stops leading", () => {
  it("above a stranger's fresh room and a filling one", () => {
    const mine = room({ my_state: "host", player_count: 1, created_at: ago(60_000), last_activity_at: ago(60_000) });
    const fresh = room({ created_at: ago(30_000), last_activity_at: ago(30_000) });
    const filling = room({ player_count: 7 });
    expect(order([filling, fresh, mine])[0]).toBe(mine.id);
  });

  it("but a pending ask of mine still outranks it — one door at a time", () => {
    const mine = room({ my_state: "host", player_count: 1, created_at: ago(60_000), last_activity_at: ago(60_000) });
    const asked = room({ my_state: "pending" });
    expect(order([mine, asked])[0]).toBe(asked.id);
  });

  it("and once cold it sinks below every room that has someone in it", () => {
    const cold = room({ my_state: "host", player_count: 1, created_at: ago(2 * 3600_000), last_activity_at: ago(2 * 3600_000) });
    const filling = room({ player_count: 4 });
    const stranger = room({ player_count: 0 });
    expect(order([cold, filling, stranger])).toEqual([filling.id, stranger.id, cold.id]);
  });

  it("still above the rooms whose couch has closed the app", () => {
    // Sunk, not hidden: it is still the one card the viewer can act on.
    const cold = room({ my_state: "host", player_count: 1, created_at: ago(2 * 3600_000), last_activity_at: ago(2 * 3600_000) });
    const gone = room({ player_count: 5 });
    const ctx: PublicRoomContext = {
      seatedByRoom: new Map([[cold.id, [cold.host_user_id]], [gone.id, [gone.host_user_id]]]),
      onlineIds: new Set([cold.host_user_id]),
      friendIds: new Set(),
    };
    expect(sortPublicRooms([gone, cold], new Set(), ctx).map((r) => r.id)).toEqual([cold.id, gone.id]);
  });

  it("a room of mine somebody DID join keeps its old place", () => {
    // The demotion is about rooms nobody came to, not about age.
    const joined = room({ my_state: "host", player_count: 3, created_at: ago(8 * 3600_000), last_activity_at: ago(8 * 3600_000) });
    const stranger = room({ player_count: 1 });
    expect(order([stranger, joined])[0]).toBe(joined.id);
  });
});

describe("the ring on the card", () => {
  it("is drawn on exactly the condition that puts it first", () => {
    expect(section).toMatch(/const freshlyMine = room\.player_count <= 1 && isFreshOwnRoom\(room\);/);
    expect(section).toMatch(/\{freshlyMine && \(/);
    expect(section).toMatch(/className="fresh-room-ring pointer-events-none absolute inset-0 z-30 rounded-2xl"/);
  });

  it("built the way the lobby's ring is, so there is one idiom for it", () => {
    // A conic gradient painted into a border-shaped mask, its angle turned
    // by a registered custom property.
    expect(css).toMatch(/@property --fresh-room-ring-angle \{/);
    expect(css).toMatch(/@keyframes fresh-room-ring-drift \{\s*\n\s*to \{ --fresh-room-ring-angle: 360deg; \}/);
    expect(css).toMatch(/\.fresh-room-ring \{[\s\S]*?mask-composite: exclude;/);
  });

  it("and it stops for a reader who asked motion to stop", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.fresh-room-ring \{ animation: none; \}/);
  });
});

describe("the host can fill the room from the list", () => {
  it("a + at the end of the seats row, on rooms I host that have room", () => {
    expect(section).toMatch(/const canInvite = room\.my_state === "host" && !full;/);
    expect(section).toMatch(/\{canInvite && \(/);
    // The row draws even when there is nothing but the + to put in it.
    expect(section).toMatch(/\{\(seatsToDraw > 0 \|\| canInvite\) && \(/);
  });

  it("which opens the invite sheet without leaving the page", () => {
    // The card's own tap enters the room, so the + has to stop it — or the
    // host is carried off the list they were inviting from.
    expect(section).toMatch(/e\.stopPropagation\(\);\s*\n\s*onInvite\(room\);/);
    expect(section).toMatch(/const \[inviting, setInviting\] = useState<PublicRoom \| null>\(null\);/);
    expect(section).toMatch(/onInvite=\{setInviting\}/);
    // roomId is what puts the shared sheet in room-invite mode.
    expect(section).toMatch(/roomId=\{inviting\?\.id\}/);
    expect(section).toMatch(/roomCode=\{inviting\?\.room_code\}/);
  });
});

describe("a room nobody ever came to stops being listed after a week", () => {
  it("swept once, and kept swept by the listing itself", () => {
    // There is no scheduler on this database, so the rule has to hold at
    // read time or the list fills up again by next week.
    expect(sql).toMatch(/UPDATE public\.game_rooms r\s*\n\s*SET is_archived = true/);
    expect(sql).toMatch(/AND NOT \(\s*\n\s*COALESCE\(r\.last_activity_at, r\.created_at\) < now\(\) - interval '7 days'/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.public_rooms\(p_limit integer DEFAULT 40\)/);
  });

  it("narrowly: only rooms nobody but the host was ever in", () => {
    // A room that had guests is somebody's game, however quiet it has gone.
    expect((sql.match(/rp2?\.room_id = r\.id\s*\n?\s*\) <= 1/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(sql).toMatch(/\) <= 1;/);
  });

  it("archived rather than deleted", () => {
    // Deleting would take the room's rounds and answers with it, and both
    // listings already respect is_archived.
    expect(sql).not.toMatch(/DELETE FROM public\.game_rooms/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.public_rooms\(integer\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.public_rooms\(integer\) TO authenticated;/);
  });
});
