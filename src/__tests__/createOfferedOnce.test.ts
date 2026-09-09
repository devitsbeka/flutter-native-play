/**
 * "Create" is offered once, then the footer tells the plain truth.
 *
 * A host alone in a finished room is handed "Create": a way out to the list
 * their room leads, because the second player has to come from there. Press
 * it, come back, and nothing about the room has changed — it is the same
 * finished room still waiting on somebody — so offering the same trip again
 * is a loop rather than a way on.
 *
 * From the second visit the button says what is actually true: Start, dead
 * until there are two of you, and clickable the moment there are (owner:
 * "when i click create once we should show disable start game button again
 * and when there are minimum 2 online players in the room - we show start
 * game as clickable").
 *
 * Remembered per device rather than on the room row: it is a fact about what
 * this person has been shown, not about the room.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The suite runs on node, with no DOM. A few lines of in-memory storage
// beats pulling jsdom in for one file — this repo carries two lockfiles and
// a dependency added carelessly takes CI down (CLAUDE.md #2). Same shim
// authSessionAndReturn.test.ts uses, and it has to be installed before the
// module under test is imported.
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
(globalThis as unknown as { localStorage: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;

const {
  CREATE_OFFERED_KEY,
  CREATE_OFFERED_MAX,
  hasPressedCreate,
  rememberPressedCreate,
} = await import("@/utils/roomCreateOffered");

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("remembering the rooms whose Create has been pressed", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("a room nobody has pressed it on is still owed the offer", () => {
    expect(hasPressedCreate("room-1")).toBe(false);
  });

  it("and one it has been pressed on is not", () => {
    rememberPressedCreate("room-1");
    expect(hasPressedCreate("room-1")).toBe(true);
    // Only that room: the offer is per room, not per person.
    expect(hasPressedCreate("room-2")).toBe(false);
  });

  it("pressing twice does not put the same room in the list twice", () => {
    rememberPressedCreate("room-1");
    rememberPressedCreate("room-1");
    expect(JSON.parse(localStorage.getItem(CREATE_OFFERED_KEY) ?? "[]")).toEqual(["room-1"]);
  });

  it("no room id is not a room — it cannot have been pressed", () => {
    expect(hasPressedCreate(null)).toBe(false);
    expect(hasPressedCreate(undefined)).toBe(false);
    expect(hasPressedCreate("")).toBe(false);
    // And writing one is a no-op rather than an empty string in the list.
    rememberPressedCreate(null);
    expect(localStorage.getItem(CREATE_OFFERED_KEY)).toBeNull();
  });

  it("keeps the rooms being moved between, not every room ever made", () => {
    for (let i = 0; i < CREATE_OFFERED_MAX + 10; i++) rememberPressedCreate(`room-${i}`);
    const stored: string[] = JSON.parse(localStorage.getItem(CREATE_OFFERED_KEY) ?? "[]");
    expect(stored).toHaveLength(CREATE_OFFERED_MAX);
    // Newest first, so the room just left is never the one that falls off.
    expect(stored[0]).toBe(`room-${CREATE_OFFERED_MAX + 9}`);
    expect(hasPressedCreate("room-0")).toBe(false);
  });

  it("garbage in the slot reads as 'not pressed', not as a crash", () => {
    localStorage.setItem(CREATE_OFFERED_KEY, "{not json");
    expect(hasPressedCreate("room-1")).toBe(false);
    localStorage.setItem(CREATE_OFFERED_KEY, JSON.stringify({ room: 1 }));
    expect(hasPressedCreate("room-1")).toBe(false);
    localStorage.setItem(CREATE_OFFERED_KEY, JSON.stringify(["room-1", 7, null]));
    expect(hasPressedCreate("room-1")).toBe(true);
  });

  it("a browser that refuses storage outright still leaves the offer standing", () => {
    // A private window, or site data blocked: the accessor itself throws.
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => rememberPressedCreate("room-1")).not.toThrow();
    expect(hasPressedCreate("room-1")).toBe(false);
  });
});

describe("what the lobby does with it", () => {
  it("reads it per room, because the lobby outlives any one room", () => {
    expect(lobby).toMatch(/const \[createOffered, setCreateOffered\] = useState\(false\);/);
    expect(lobby).toMatch(
      /setCreateOffered\(!hasPressedCreate\(currentRoom\?\.id\)\);\s*\n\s*\}, \[currentRoom\?\.id\]\);/,
    );
  });

  it("offers Create only while it is still owed", () => {
    expect(lobby).toMatch(/const offerCreate = awaitingPlayers && createOffered;/);
  });

  it("writes it before leaving, so coming back finds the offer spent", () => {
    expect(lobby).toMatch(/rememberPressedCreate\(currentRoom\?\.id\);\s*\n\s*setCreateOffered\(false\);/);
  });

  it("and the button goes back to a dead Start once it is", () => {
    expect(lobby).toMatch(
      /disabled:\s*\n\s*!canStartGame \|\| isStarting \|\| loading \|\| \(awaitingPlayers && !offerCreate\),/,
    );
  });

  it("which arms itself the moment a second player is here", () => {
    // `awaitingPlayers` is false once two can answer, so the clause above
    // stops disabling — no separate re-enable path to keep in step.
    expect(lobby).toMatch(
      /const awaitingPlayers = !needsCategorySelection && !enoughPlayers && !isStarting;/,
    );
    expect(lobby).toMatch(/const enoughPlayers = answeringPlayers >= 2;/);
  });

  it("and the caption keeps explaining the wait either way", () => {
    // It hangs off awaitingPlayers, not the offer — a spent offer does not
    // make the room any less short of a player.
    expect(lobby).toMatch(/caption: awaitingPlayers/);
  });
});
