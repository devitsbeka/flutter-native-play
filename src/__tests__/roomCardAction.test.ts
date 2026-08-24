import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { roomCardAction } from "@/utils/roomCardAction";

/**
 * The button on a room card.
 *
 * Every card used to carry one only while a round was live, so the list read
 * as a shelf of dormant rooms even when the people in them were online and
 * looking for a game. Now the card answers the one question worth asking of
 * it — is there anybody to play with, and whose move is it — and stays quiet
 * when the answer is nobody.
 */
const room = (over: Partial<Parameters<typeof roomCardAction>[0]> = {}) => ({
  status: "waiting",
  tv_status: null,
  is_host: false,
  has_others_online: false,
  ...over,
});

describe("what a room card offers", () => {
  it("offers nothing when nobody else is online", () => {
    // The whole point of the null. Most rooms on this list are old, and a
    // button on every one of them says nothing about any of them.
    expect(roomCardAction(room({ is_host: true }))).toBeNull();
    expect(roomCardAction(room({ is_host: false }))).toBeNull();
  });

  it("offers the host the start of a round", () => {
    expect(roomCardAction(room({ is_host: true, has_others_online: true }))).toBe("start");
  });

  it("offers everyone else the way in", () => {
    expect(roomCardAction(room({ is_host: false, has_others_online: true }))).toBe("enter");
  });

  it("counts an online player who is not in the room", () => {
    // has_others_online is presence in the app, not presence in this lobby —
    // a round reaches a player on Discover now, so waiting for them to walk
    // into the room first would be waiting for nothing.
    expect(roomCardAction(room({ has_others_online: true }))).toBe("enter");
  });

  describe("a round already running", () => {
    it("outranks the host's start button", () => {
      // Starting a round that is running is not a thing the host can do.
      expect(
        roomCardAction(room({ status: "playing", is_host: true, has_others_online: true }))
      ).toBe("live");
    });

    it("shows even with nobody marked online", () => {
      // Presence is a two-minute heartbeat and a live round is right now. A
      // player mid-question whose heartbeat has not landed yet must not make
      // the button that gets you to that question disappear.
      expect(roomCardAction(room({ status: "playing" }))).toBe("live");
    });

    it("counts a live TV session too", () => {
      expect(roomCardAction(room({ tv_status: "question" }))).toBe("live");
    });

    it("does not count a TV merely paired and waiting", () => {
      // Connected is not playing; without others online there is still
      // nothing to offer.
      expect(roomCardAction(room({ tv_status: "paired" }))).toBeNull();
    });
  });
});

/**
 * The three states have to reach the screen with three different words, and
 * the words have to be the ones already used elsewhere for the same act —
 * the lobby's own start button, and the join button on a live card.
 */
describe("the card that draws it", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/team/MyRoomsSection.tsx"),
    "utf8"
  );

  it("asks the shared rule rather than re-deriving it", () => {
    expect(source).toMatch(/const action = roomCardAction\(room\)/);
  });

  it("draws no button at all when there is no action", () => {
    // Not a disabled button, not an empty pill: nothing.
    expect(source).toMatch(/\{action && \(\s*<motion\.button/);
  });

  it("says what the lobby says when the host starts a round", () => {
    expect(source).toMatch(/action === "start" \?[\s\S]{0,200}extra\.rlStartGame/);
  });

  it("pulses only for the live round", () => {
    // The pulse means "happening now". On a lobby that is merely occupied it
    // would be crying wolf on every card in the list.
    expect(source).toMatch(/animate=\{action === "live" \? \{ scale: \[1, 1\.05, 1\] \} : undefined\}/);
  });
});
