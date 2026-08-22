import { describe, it, expect } from "vitest";
import {
  isActiveRoundPlayer,
  activeRoundPlayers,
  allActivePlayersPast,
} from "@/utils/roundPlayers";

/**
 * A round must not wait on a player who cannot answer.
 *
 * Reported from a real game: the host of a room built from their own trivia
 * skips the questions (they wrote them) and watches instead — and the
 * observer view stayed on question one while everybody else played the round
 * out. The advance condition was "every other participant has moved past this
 * question", over a list that includes seats nobody is sitting in.
 *
 * The same shape decides when a round is over, so a player closing the app
 * mid-game could hold the whole room open. MultiplayerContextV2 had already
 * been bitten by that and skipped `disconnected`; it did not skip `invited`.
 */
const player = (id: string, q: number, status = "playing") => ({
  user_id: id,
  status,
  current_question: q,
});

describe("who a round is waiting on", () => {
  it("counts a player who is playing", () => {
    expect(isActiveRoundPlayer(player("a", 2))).toBe(true);
  });

  it("does not count a seat nobody took", () => {
    // current_question never leaves 0 for an invitation that was never accepted
    expect(isActiveRoundPlayer(player("a", 0, "invited"))).toBe(false);
  });

  it("does not count a player who left mid-round", () => {
    expect(isActiveRoundPlayer(player("a", 1, "disconnected"))).toBe(false);
  });

  it("does not count the host when the host is watching", () => {
    expect(
      isActiveRoundPlayer(player("host", 0), { hostIsObserver: true, hostUserId: "host" })
    ).toBe(false);
    // ...but does when the host is playing
    expect(
      isActiveRoundPlayer(player("host", 0), { hostIsObserver: false, hostUserId: "host" })
    ).toBe(true);
  });

  it("excludes the viewer when asked to", () => {
    expect(isActiveRoundPlayer(player("me", 3), { excludeUserId: "me" })).toBe(false);
  });

  it("still counts someone who has finished the round", () => {
    // Finished is past the question, not absent from the round.
    expect(isActiveRoundPlayer(player("a", 10, "finished"))).toBe(true);
  });
});

describe("advancing past a question", () => {
  it("advances once the real players have moved on", () => {
    const room = [player("a", 2), player("b", 2)];
    expect(allActivePlayersPast(room, 1)).toBe(true);
  });

  it("waits while a real player is still on the question", () => {
    const room = [player("a", 2), player("b", 1)];
    expect(allActivePlayersPast(room, 1)).toBe(false);
  });

  // The reported bug, stated as a test.
  it("is not held up by an invitation nobody accepted", () => {
    const room = [player("a", 2), player("b", 2), player("ghost", 0, "invited")];
    expect(allActivePlayersPast(room, 1)).toBe(true);
  });

  // And the generalisation: someone closing the app mid-game.
  it("is not held up by a player who walked away", () => {
    const room = [player("a", 2), player("b", 2), player("gone", 0, "disconnected")];
    expect(allActivePlayersPast(room, 1)).toBe(true);
  });

  it("is not held up by the watching host", () => {
    const room = [player("a", 2), player("host", 0)];
    expect(
      allActivePlayersPast(room, 1, { hostIsObserver: true, hostUserId: "host" })
    ).toBe(true);
  });

  it("does not march on through an empty room", () => {
    // [].every() is true, so without this an emptied room would read as
    // "everyone advanced" and walk the observer through the whole quiz.
    expect(allActivePlayersPast([], 1)).toBe(false);
    expect(allActivePlayersPast([player("ghost", 0, "invited")], 1)).toBe(false);
  });
});

describe("the active list itself", () => {
  it("drops every seat that cannot answer, keeping the rest in order", () => {
    const room = [
      player("a", 1),
      player("ghost", 0, "invited"),
      player("b", 1),
      player("gone", 0, "disconnected"),
    ];
    expect(activeRoundPlayers(room).map((p) => p.user_id)).toEqual(["a", "b"]);
  });
});
