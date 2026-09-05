/**
 * Refreshing the home page took you to the online-game page. Every time.
 *
 * RoundStartWatcher is mounted outside <Routes>, so it runs on every screen —
 * that is the point of it, since a player who wandered off has no
 * subscription to their room. It hears about a round starting two ways: a
 * live UPDATE on the room, and a one-off read when it mounts.
 *
 * That read was written for a narrow race — the host presses start while the
 * player is mid-navigation, so nothing is listening yet — but it was
 * implemented as "is this room playing?", with no time bound. A room sits in
 * `playing` indefinitely: an abandoned match, a game nobody settled, a lobby
 * open since last month. So on EVERY page load, on every page, it read that
 * row and navigated. `handledGameRef` did not help — it is a ref, so a
 * reload starts it at null again.
 *
 * The live path is untouched: an UPDATE is by definition happening now. Only
 * the mount-time guess has to prove the start is recent.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTDOWN_MS,
  ROUND_START_CATCHUP_MS,
  ROUND_START_GRACE_MS,
  isFreshRoundStart,
} from "@/utils/roundCountdown";
import { isInterruptible } from "@/utils/roundStartRoutes";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const watcher = read("src/components/system/RoundStartWatcher.tsx");

describe("a mounting page only chases a start that just happened", () => {
  it("the two sources are told apart", () => {
    expect(watcher).toMatch(/source: "live" \| "catchup"/);
    expect(watcher).toMatch(/onRoomUpdate\(room, "catchup"\);/);
    expect(watcher).toMatch(/onRoomUpdate\(payload\.new as RoomRow, "live"\)/);
  });

  it("and only the catch-up has to prove itself", () => {
    expect(watcher).toMatch(
      /if \(source === "catchup" && !isFreshRoundStart\(room\.started_at, Date\.now\(\)\)\) return;/,
    );
  });

  it("the check runs before the round is marked handled", () => {
    // Bailing after `handledGameRef` was set would swallow the real live
    // event for the same round moments later.
    const guard = watcher.indexOf('source === "catchup"');
    const marked = watcher.indexOf("handledGameRef.current = key;");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(marked);
  });

  it("the watcher still runs everywhere, which is why this mattered", () => {
    // Home is interruptible — that is correct and is not what is being
    // changed. What changed is that "playing" alone no longer counts.
    expect(isInterruptible("/")).toBe(true);
    expect(isInterruptible("/team")).toBe(false);
    expect(isInterruptible("/king")).toBe(false);
  });
});

describe("what counts as fresh, run rather than read", () => {
  const NOW = 1_700_000_000_000;
  const iso = (ms: number) => new Date(ms).toISOString();

  it("a start moments ago is chased", () => {
    expect(isFreshRoundStart(iso(NOW), NOW)).toBe(true);
    expect(isFreshRoundStart(iso(NOW - 2_000), NOW)).toBe(true);
  });

  it("covers the count, its grace, and a slow cold mount", () => {
    expect(ROUND_START_CATCHUP_MS).toBeGreaterThan(COUNTDOWN_MS + ROUND_START_GRACE_MS);
    expect(isFreshRoundStart(iso(NOW - (COUNTDOWN_MS + ROUND_START_GRACE_MS)), NOW)).toBe(true);
  });

  it("a room that has been playing for a while is left alone", () => {
    expect(isFreshRoundStart(iso(NOW - ROUND_START_CATCHUP_MS), NOW)).toBe(false);
    expect(isFreshRoundStart(iso(NOW - 60_000), NOW)).toBe(false);
    // The reported case: an abandoned room from days ago.
    expect(isFreshRoundStart(iso(NOW - 3 * 24 * 3600_000), NOW)).toBe(false);
  });

  it("'playing since who knows when' never navigates anybody", () => {
    // The row that caused this: status playing, no usable start time.
    expect(isFreshRoundStart(null, NOW)).toBe(false);
    expect(isFreshRoundStart(undefined, NOW)).toBe(false);
    expect(isFreshRoundStart("", NOW)).toBe(false);
    expect(isFreshRoundStart("not a date", NOW)).toBe(false);
  });

  it("a device clock behind the server's still counts", () => {
    // The start is in this device's future; it has still just happened.
    expect(isFreshRoundStart(iso(NOW + 4_000), NOW)).toBe(true);
  });
});
