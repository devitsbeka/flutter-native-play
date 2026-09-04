import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { roomCardAction } from "@/utils/roomCardAction";
import { compareRooms } from "@/utils/roomOrder";

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
    expect(source).toMatch(/\{action && \(\s*\/\*[\s\S]*?<RoomCardPlayButton/);
  });

  it("says Play, in the short form, whichever state the card is in", () => {
    // It used to be three labels for one act — "Join" on a live round,
    // "Join" again on a room I have a seat in, the short "Play" only when I
    // host it — and the state they were distinguishing is already on the
    // card above them.
    expect(source).toMatch(/<Play className="w-3\.5 h-3\.5 fill-current" \/>/);
    expect(source).toMatch(/t\("extra\.roomPlay"\)/);
    expect(source).not.toMatch(/extra\.roomJoinLive/);
    // "თამაშის დაწყება" is four syllables in a pill that shares its row with
    // a count and two faces, and it pushed the group off the card. The lobby
    // keeps the long form; it has a screen width to say it in.
    expect(source, "the long form does not fit on a card").not.toMatch(/extra\.rlStartGame/);
  });

  it("is the public list's button in another colour", () => {
    // Same component, same shape, same words: only the tone differs.
    expect(source).toMatch(/<RoomCardPlayButton\s*\n\s*tone="white"/);
    const publicList = readFileSync(
      join(process.cwd(), "src/components/team/PublicRoomsSection.tsx"),
      "utf8",
    );
    expect(publicList).toMatch(/<RoomCardPlayButton\s*\n\s*tone="mint"/);
    const button = readFileSync(
      join(process.cwd(), "src/components/team/RoomCardPlayButton.tsx"),
      "utf8",
    );
    // The tone map carries colours and nothing else — no second shape can
    // creep back in through it.
    const tones = button.slice(button.indexOf("const TONES"), button.indexOf("export const RoomCardPlayButton"));
    expect(tones).not.toMatch(/rounded|px-|py-|text-sm|font-|shadow|backdrop/);
  });

  it("pulses only for the live round", () => {
    // The pulse means "happening now". On a lobby that is merely occupied it
    // would be crying wolf on every card in the list.
    expect(source).toMatch(/animate=\{action === "live" \? \{ scale: \[1, 1\.05, 1\] \} : undefined\}/);
  });
});

/**
 * An invitation is the one entry on this list another person put there on
 * purpose, and it was worthless where it landed. Invites tend to arrive for
 * old rooms, whose recency is months stale — so the room you had just been
 * asked into sorted below every room you happened to open yesterday, and its
 * card was as silent as all of them.
 */
describe("a room somebody invited you to", () => {
  it("offers a way in even with nobody online", () => {
    // The one case where "nobody is online" is the wrong answer: somebody
    // wanted you there specifically.
    expect(roomCardAction(room({ has_pending_invite: true }))).toBe("enter");
  });

  it("offers the host a way in too, not a start", () => {
    // You cannot be invited into your own room in the normal course of
    // things, but if it happens, answering the invite is the act — and there
    // is still nobody there to start a round with.
    expect(roomCardAction(room({ is_host: true, has_pending_invite: true }))).toBe("enter");
  });

  it("still yields to a round already running", () => {
    expect(
      roomCardAction(room({ status: "playing", has_pending_invite: true }))
    ).toBe("live");
  });
});

describe("where an invited room sorts", () => {
  it("goes above everything else on the list", () => {
    const old = { created_at: "2020-01-01T00:00:00Z", hasPendingInvite: true };
    const fresh = { created_at: "2026-08-24T00:00:00Z" };
    expect(
      compareRooms(old, fresh),
      "an invite to a stale room still beats a room you opened yesterday"
    ).toBeLessThan(0);
    expect(compareRooms(fresh, old)).toBeGreaterThan(0);
  });

  it("beats even a live TV session", () => {
    expect(
      compareRooms({ created_at: "2020-01-01T00:00:00Z", hasPendingInvite: true }, { created_at: "2026-08-24T00:00:00Z", hasLiveTV: true })
    ).toBeLessThan(0);
  });

  it("leaves the order alone when neither is invited", () => {
    const a = { created_at: "2026-08-24T00:00:00Z" };
    const b = { created_at: "2020-01-01T00:00:00Z" };
    expect(compareRooms(a, b)).toBeLessThan(0);
  });
});

/**
 * "Pending" is read off the notifications already in memory rather than
 * queried, so opening the room — which marks the notification read — retires
 * the invite with no second source of truth to keep in step.
 */
describe("where the invite flag comes from", () => {
  const hook = readFileSync(join(process.cwd(), "src/hooks/useMyRooms.ts"), "utf8");

  it("reads unread room_invite notifications", () => {
    const fn = hook.match(/const invitedRoomIds = useMemo\([\s\S]*?\n {2}\}, \[notifications\]\);/);
    expect(fn, "expected invitedRoomIds").not.toBeNull();
    expect(fn![0]).toMatch(/n\.type !== "room_invite" \|\| n\.read_at/);
  });

  it("does not add a query for it", () => {
    // The context already holds every notification and realtime keeps it
    // current; a second fetch would only be a second thing to go stale.
    expect(hook).not.toMatch(/from\("notifications"\)/);
  });

  it("feeds both the button and the sort", () => {
    expect(hook).toMatch(/has_pending_invite: true/);
    expect(hook).toMatch(/hasPendingInvite: a\.has_pending_invite/);
  });
});
