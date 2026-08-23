import { describe, expect, it } from "vitest";
import { isRoomLive } from "@/hooks/useMyRooms";

/**
 * What "live" means on a room card, because it decides whether a player
 * standing on the online-game list is shown a way to jump in.
 *
 * The cost of getting it wrong is asymmetric. A missing button on a real
 * round is a player left out of a game they are in; a button on a room where
 * nothing is happening sends them to a lobby and teaches them to ignore it.
 */

const room = (status: string, tv: string | null = null) => ({ status, tv_status: tv });

describe("isRoomLive", () => {
  it("is live while a phone round is being played", () => {
    expect(isRoomLive(room("playing"))).toBe(true);
  });

  it("is not live for a room that is only waiting, ready, done or dead", () => {
    // "ready" is the one worth naming: everyone has pressed ready and the
    // host still has not started. There is nothing to be late for yet.
    for (const status of ["waiting", "ready", "completed", "cancelled"]) {
      expect(isRoomLive(room(status))).toBe(false);
    }
  });

  it("is live for a TV round even though the room status trails it", () => {
    // A game on the TV runs off tv_sessions; game_rooms.status is not what
    // moves. Reading only `status` would leave every TV round unmarked.
    for (const tv of ["countdown", "question", "playing", "reveal", "round-intro"]) {
      expect(isRoomLive(room("waiting", tv))).toBe(true);
    }
  });

  it("is not live for a TV that is merely connected and waiting", () => {
    // Paired and lobby mean a screen is on and nobody is playing yet — the
    // distinction isActiveTVSession does not draw.
    for (const tv of ["paired", "lobby", "waiting", "category-select", "poll-voting"]) {
      expect(isRoomLive(room("waiting", tv))).toBe(false);
    }
  });

  it("treats a room with no TV as simply having no TV", () => {
    expect(isRoomLive(room("waiting", null))).toBe(false);
    expect(isRoomLive(room("playing", null))).toBe(true);
  });
});
