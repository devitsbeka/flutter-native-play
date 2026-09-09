/**
 * A published room starts when two people are actually there.
 *
 * The Start button counted seats: rows in `room_participants` that were not
 * invitations. On a public room that is the wrong count — a stranger who
 * joined this morning and closed the app is a row in the table and nobody at
 * it, and starting on their behalf produces a "result" against somebody who
 * never saw a question. A published room is played through, together, now,
 * and its results screen names a winner while everyone is still looking at
 * it (owner: "we need literal online players to start game in public rooms
 * to see results instantly who won who lose").
 *
 * A PRIVATE room keeps counting seats, deliberately: those are played across
 * the evening as each invited friend gets to it, so requiring everyone awake
 * at once is the opposite of what a private room is for.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const hook = read("src/hooks/useParticipantPresence.ts");

describe("which count the button judges", () => {
  it("online answerers on a public room, seated ones on a private", () => {
    expect(lobby).toMatch(
      /const enoughPlayers =\s*\n\s*isPublicRoom && presenceLoaded \? onlineAnswerers >= 2 : answeringPlayers >= 2;/,
    );
  });

  it("counted among the seated, and minus a host who sits the round out", () => {
    // The same subtraction the seated count makes: a host playing their own
    // trivia knows the answers and is not one of the two.
    expect(lobby).toMatch(
      /const onlineAnswerers =\s*\n\s*seatedIdsForPresence\.filter\(\(id\) => onlineInRoom\.has\(id\)\)\.length - \(willBeObserver \? 1 : 0\);/,
    );
    expect(lobby).toMatch(
      /seatedIdsForPresence = useMemo\(\s*\n\s*\(\) => participants\.filter\(\(p\) => \(p\.status as string\) !== "invited"\)\.map\(\(p\) => p\.user_id\),/,
    );
  });

  it("and the runtime guard still reads whatever that came to", () => {
    // The button is the first line of defence; this is the one that holds
    // when the picker auto-starts or the last player leaves mid-tap.
    expect(lobby).toMatch(/enoughPlayersRef\.current = enoughPlayers;/);
  });
});

describe("presence may withhold the button only once it has answered", () => {
  it("before the first fetch, the seated count stands", () => {
    // An empty `online` set is indistinguishable from everybody having
    // closed the app, and would grey out Start on a room with a full couch
    // for as long as the first fetch takes.
    expect(lobby).toMatch(/isPublicRoom && presenceLoaded \?/);
    expect(hook).toMatch(/loaded: boolean;/);
  });

  it("and it keeps looking, because going stale is the absence of an event", () => {
    expect(hook).toMatch(/const RECHECK_MS = 30_000;/);
    expect(hook).toMatch(/setInterval\(run, RECHECK_MS\)/);
  });

  it("through the same rule every other screen's green ring uses", () => {
    // A player must not be online enough to start a game on one screen and
    // grey on another.
    expect(hook).toMatch(/onlineUserIds\(ids\)/);
    expect(read("src/utils/presence.ts")).toMatch(/presence_for_users/);
  });
});

describe("the hooks sit where hooks may sit", () => {
  it("above the lobby's early return, not beside the count that reads them", () => {
    // Everything after `if (!currentRoom) return null` runs on some renders
    // and not others; a hook there changes the hook order between renders.
    const guard = lobby.indexOf("if (!currentRoom) return null;");
    expect(guard).toBeGreaterThan(0);
    expect(lobby.indexOf("useParticipantPresence(seatedIdsForPresence)")).toBeLessThan(guard);
    expect(lobby.indexOf("const seatedIdsForPresence = useMemo(")).toBeLessThan(guard);
  });
});
