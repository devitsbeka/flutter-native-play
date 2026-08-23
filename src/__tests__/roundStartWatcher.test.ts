import { describe, it, expect } from "vitest";
import { isInterruptible } from "@/utils/roundStartRoutes";

/**
 * When it is right to pull a player into a starting round.
 *
 * Waiting for a host is dead time and people wander off, so the room has to
 * come and get them. But being yanked out of a question you are answering is
 * worse than joining a round a second late, so a page that is itself a game
 * is left alone.
 */
describe("pages a starting round may interrupt", () => {
  it.each(["/", "/discover", "/profile", "/shop", "/leaderboards", "/notifications"])(
    "interrupts %s",
    (path) => expect(isInterruptible(path)).toBe(true),
  );

  it("does not interrupt a solo quiz in progress", () => {
    // Its own clock, its own scoring — losing it costs the player the level.
    expect(isInterruptible("/play/geography/3")).toBe(false);
  });

  it("does not interrupt the 1v1 game screen", () => {
    expect(isInterruptible("/game")).toBe(false);
  });

  it("does not interrupt a TV session", () => {
    // Someone's living-room game, on two devices.
    expect(isInterruptible("/tv")).toBe(false);
    expect(isInterruptible("/tv/host/abc")).toBe(false);
    expect(isInterruptible("/join/session/abc")).toBe(false);
  });

  it("does nothing when the player is already in the room", () => {
    // Navigating would be a no-op at best and a remount at worst.
    expect(isInterruptible("/team")).toBe(false);
  });

  it("is not fooled by a path that merely starts with the same letters", () => {
    // /playlist is not /play/
    expect(isInterruptible("/playlist")).toBe(true);
    expect(isInterruptible("/games-archive")).toBe(true);
  });
});
