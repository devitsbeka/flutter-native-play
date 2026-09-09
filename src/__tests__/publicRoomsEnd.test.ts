/**
 * A public room ends with its play — server-side, and on every list.
 *
 * A public room is made for one play: a match of one round or many, then
 * only as many rematches as the table accepts (owner: "host creates public
 * room, adds categories, modifies and when game will be played (play can be
 * one round, many rounds per match, pro users can initiate re-matches, play
 * several matches) but after all ends room should be deleted").
 *
 * The client already closed it on the paths it could see — the host's back
 * arrow off the results screen (#672), a rejoin an hour later (#673). It
 * could not see the host who put the phone down on the results screen and
 * never came back: that room stayed `completed` for good — off the Public
 * tab, but on the host's own list for ever, and outside every sweep.
 *
 * One rule now, `public_room_is_over`, in the database and mirrored here:
 * public, quiet for an hour, and mid-round, finished, or played out with
 * nothing to play. The Public tab refuses to list such a room; the app
 * asks the database to sweep them — cancelled and archived — before it
 * reads that tab; the host's own list hides them by the same rule; and a
 * rejoin closes one rather than reviving it. Private rooms are never over.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPublicRoomOver } from "@/utils/publicRoomOver";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const HOUR = 60 * 60 * 1000;
const now = Date.parse("2026-09-09T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

const room = (over: Partial<Parameters<typeof isPublicRoomOver>[0]> = {}) => ({
  is_public: true,
  status: "completed",
  created_at: ago(3 * HOUR),
  last_activity_at: ago(2 * HOUR),
  started_at: ago(2 * HOUR + 10 * 60_000),
  completed_at: ago(2 * HOUR),
  category_id: null,
  user_trivia_id: null,
  ...over,
});

describe("isPublicRoomOver", () => {
  it("a public room finished two hours ago is over", () => {
    expect(isPublicRoomOver(room(), now)).toBe(true);
  });

  it("one finished ten minutes ago is not — the table may still rematch", () => {
    expect(isPublicRoomOver(room({ last_activity_at: ago(10 * 60_000), completed_at: ago(10 * 60_000) }), now)).toBe(false);
  });

  it("a round stuck in playing since yesterday is over", () => {
    expect(isPublicRoomOver(room({ status: "playing", created_at: ago(24 * HOUR), last_activity_at: ago(23 * HOUR), started_at: ago(23 * HOUR), completed_at: null }), now)).toBe(true);
  });

  it("the latest stamp counts, whichever column carries it", () => {
    // Quiet by last_activity_at, but a completion five minutes ago.
    expect(isPublicRoomOver(room({ completed_at: ago(5 * 60_000) }), now)).toBe(false);
  });

  describe("back in waiting", () => {
    it("played out, nothing to play, no queue, quiet: over", () => {
      expect(isPublicRoomOver(room({ status: "waiting", has_queue: false }), now)).toBe(true);
    });

    it("with a category, a trivia or a queued round it is the next game, and stays", () => {
      expect(isPublicRoomOver(room({ status: "waiting", has_queue: false, category_id: "history" }), now)).toBe(false);
      expect(isPublicRoomOver(room({ status: "waiting", has_queue: false, user_trivia_id: "t" }), now)).toBe(false);
      expect(isPublicRoomOver(room({ status: "waiting", has_queue: true }), now)).toBe(false);
    });

    it("never played — activity is its creation — it is not over, however quiet", () => {
      expect(isPublicRoomOver(room({ status: "waiting", has_queue: false, last_activity_at: ago(3 * HOUR), started_at: null, completed_at: null }), now)).toBe(false);
    });

    it("is left alone when the caller does not know the queue", () => {
      // A wrong "over" closes somebody's next game; a wrong "not over" is a
      // room the sweep takes on the next read.
      expect(isPublicRoomOver(room({ status: "waiting" }), now)).toBe(false);
    });
  });

  it("a private room is never over", () => {
    expect(isPublicRoomOver(room({ is_public: false }), now)).toBe(false);
    expect(isPublicRoomOver(room({ is_public: null }), now)).toBe(false);
  });

  it("nor is one already closed", () => {
    expect(isPublicRoomOver(room({ status: "cancelled" }), now)).toBe(false);
  });
});

describe("the database's copy of the rule", () => {
  const migration = read("supabase/migrations/20261102130000_public_rooms_end.sql");

  it("is one function, the sweep, and the listing built on it", () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.public_room_is_over\(r public\.game_rooms\)/);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.sweep_ended_public_rooms\(\)/);
    expect(migration).toMatch(/WHERE public\.public_room_is_over\(r\)\s*\n\s*RETURNING r\.id/);
    expect(migration).toMatch(/AND NOT public\.public_room_is_over\(r\)\s*\n\s*ORDER BY/);
  });

  it("says the same thing this file does", () => {
    expect(migration).toMatch(/r\.is_public IS TRUE/);
    expect(migration).toMatch(/GREATEST\(r\.created_at, r\.last_activity_at, r\.started_at, r\.completed_at\)\s*\n\s*< now\(\) - interval '1 hour'/);
    expect(migration).toMatch(/r\.status::text IN \('playing', 'completed'\)/);
    expect(migration).toMatch(/r\.last_activity_at > r\.created_at \+ interval '1 minute'/);
  });

  it("closes, not deletes — cancelled so clients are told, archived so lists hide it", () => {
    expect(migration).toMatch(/SET status = 'cancelled',\s*\n\s*is_archived = true/);
    expect(migration).not.toMatch(/DELETE FROM public\.game_rooms/);
  });

  it("is revoked from PUBLIC and anon and granted only to the signed-in", () => {
    for (const fn of ["public_room_is_over(public.game_rooms)", "sweep_ended_public_rooms()", "public_rooms(integer)"]) {
      const esc = fn.replace(/[().]/g, (c) => `\\${c}`);
      expect(migration).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc} FROM PUBLIC, anon;`));
      expect(migration).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc} TO authenticated;`));
    }
  });

  it("sweeps the backlog once, on apply", () => {
    expect(migration.trimEnd()).toMatch(/SELECT public\.sweep_ended_public_rooms\(\);$/);
  });

  it("is executed by CI", () => {
    expect(read(".github/workflows/pr-checks.yml")).toMatch(/supabase\/tests\/17-public-rooms-end\.sql/);
    expect(read("supabase/tests/17-public-rooms-end.sql")).toMatch(/sweep_ended_public_rooms/);
  });
});

describe("where the app applies it", () => {
  it("the Public tab sweeps before it reads", () => {
    const hook = read("src/hooks/usePublicRooms.ts");
    expect(hook).toMatch(/await sweepEndedPublicRooms\(\);\s*\n\s*const \{ data, error \} = await supabase\.rpc\("public_rooms"/);
    // Not deployed yet is nothing to do, not an error on the tab.
    expect(hook).toMatch(/if \(error\) return 0;/);
  });

  it("the host's own list hides what is over, by the same rule", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(/const roomsData = \(roomsRows \|\| \[\]\)\.filter\(\(r\) => !isPublicRoomOver\(r\)\);/);
  });

  it("a rejoin closes an over public room, asking the queue only when the row cannot say", () => {
    const ctx = read("src/contexts/MultiplayerContextV2.tsx");
    expect(ctx).toMatch(/if \(stale && room\.is_public\) \{/);
    expect(ctx).toMatch(/let over = isPublicRoomOver\(room\);/);
    expect(ctx).toMatch(/if \(!over && room\.status === "waiting" && !room\.category_id && !room\.user_trivia_id\) \{/);
    expect(ctx).toMatch(/over = isPublicRoomOver\(\{ \.\.\.room, has_queue: \(count \?\? 0\) > 0 \}\);/);
    // The private rooms' reset-to-lobby is still there, after it.
    expect(ctx.indexOf("let over = isPublicRoomOver(room);")).toBeLessThan(ctx.indexOf("resetting to lobby"));
  });
});
