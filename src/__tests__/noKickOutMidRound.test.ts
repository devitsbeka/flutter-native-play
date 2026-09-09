/**
 * A room being played is never "stale".
 *
 * The stale check read `last_activity_at` alone, falling back to the room's
 * creation — and `last_activity_at` was only ever written when the room was
 * made. So a room made two hours ago and being PLAYED right now counted as
 * stale, and the next rejoin (the phone slept, the webview reloaded, the
 * player came back through the room's URL) reset it to the lobby mid-round
 * with the category cleared. Owner: "when we were playing ... i was kicked
 * out and i see lobby to choose category ... if phone goes sleep, come back
 * should be smooth, landing where i was before, no kick out".
 *
 * A round that started, or finished, is activity: the reference is the
 * latest stamp on the row, and every round start writes `last_activity_at`
 * too, so the two agree and the public list's freshness follows the game.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRoomStale } from "@/utils/roomStale";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");

const HOUR = 60 * 60 * 1000;
const now = Date.parse("2026-09-09T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("isRoomStale", () => {
  it("an old room with a round that started just now is not stale", () => {
    expect(isRoomStale({ created_at: ago(3 * HOUR), last_activity_at: ago(3 * HOUR), started_at: ago(5 * 60_000) }, now)).toBe(false);
  });

  it("nor one whose round just finished", () => {
    expect(isRoomStale({ created_at: ago(3 * HOUR), started_at: ago(2 * HOUR), completed_at: ago(10 * 60_000) }, now)).toBe(false);
  });

  it("a room nobody touched for an hour is", () => {
    expect(isRoomStale({ created_at: ago(3 * HOUR), last_activity_at: ago(2 * HOUR), started_at: ago(90 * 60_000) }, now)).toBe(true);
  });

  it("falls back to creation, and never calls a row with no stamps stale", () => {
    expect(isRoomStale({ created_at: ago(30 * 60_000), last_activity_at: null }, now)).toBe(false);
    expect(isRoomStale({ created_at: ago(2 * HOUR), last_activity_at: null }, now)).toBe(true);
    expect(isRoomStale({ created_at: "not a date" }, now)).toBe(false);
  });
});

describe("activity is stamped where it happens", () => {
  it("every round start writes last_activity_at with the start", () => {
    const starts = ctx.match(/status: "playing",\s*\n\s*started_at: roundStartedAt,\s*\n\s*last_activity_at: roundStartedAt,/g) ?? [];
    expect(starts).toHaveLength(6);
  });

  it("and so does completion", () => {
    expect(ctx).toMatch(/status: "completed",\s*\n\s*completed_at: new Date\(\)\.toISOString\(\),\s*\n\s*last_activity_at: new Date\(\)\.toISOString\(\),/);
  });

  it("the rejoin reads the whole row, not one column", () => {
    expect(ctx).toMatch(/const stale = isRoomStale\(room\);/);
    expect(ctx).not.toMatch(/isRoomStale\(room\.last_activity_at, room\.created_at\)/);
    expect(ctx).toMatch(/import \{ isRoomStale \} from "@\/utils\/roomStale";/);
  });
});
