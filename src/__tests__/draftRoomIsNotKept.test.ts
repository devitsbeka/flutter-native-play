/**
 * A room the host backed out of before Create is not a room.
 *
 * "+ Room" opens the lobby on a row that already exists — a lobby needs one
 * to subscribe to, invite into and rename — but the host has not said they
 * want it. Owner: "if i click + room and didn't choose category and clicked
 * back button, room shouldn't be created, only after clicking create - we
 * create rooms".
 *
 * So the row made by "+ Room" is remembered as a draft on the device that
 * made it; Create or Start settles it; and the back arrow on an unsettled
 * draft the host is still alone in deletes the row on the way out. Never
 * with anyone else seated — joined, or invited and waiting — because that
 * is a room in use.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The suite runs on node, with no DOM: the same in-memory storage shim
// createOfferedOnce.test.ts installs, before the module under test loads.
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

const { DRAFT_ROOMS_KEY, forgetDraftRoom, isDraftRoom, rememberDraftRoom } = await import(
  "@/utils/roomCreateOffered"
);

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const hub = read("src/pages/TeamV2.tsx");

describe("the draft memory", () => {
  beforeEach(() => {
    localStorage.removeItem(DRAFT_ROOMS_KEY);
  });

  it("remembers, forgets, and answers", () => {
    expect(isDraftRoom("r1")).toBe(false);
    rememberDraftRoom("r1");
    expect(isDraftRoom("r1")).toBe(true);
    forgetDraftRoom("r1");
    expect(isDraftRoom("r1")).toBe(false);
    expect(isDraftRoom(null)).toBe(false);
  });

  it("survives garbage in storage", () => {
    localStorage.setItem(DRAFT_ROOMS_KEY, "{not json");
    expect(isDraftRoom("r1")).toBe(false);
    rememberDraftRoom("r1");
    expect(isDraftRoom("r1")).toBe(true);
  });
});

describe("+ Room makes a draft; Create and Start settle it", () => {
  it("the hub remembers the row it just made as a draft", () => {
    expect(hub).toMatch(/rememberDraftRoom\(room\.id\);\s*\n\s*navigate\(`\/team\?room=\$\{room\.room_code\}`\);/);
  });

  it("Create forgets it, and so does Start", () => {
    const create = lobby.slice(lobby.indexOf("const handleDoneCreating"), lobby.indexOf("if (enoughPlayersRef.current) return;", lobby.indexOf("const handleDoneCreating")));
    expect(create).toMatch(/forgetDraftRoom\(currentRoom\?\.id\);/);
    const start = lobby.slice(lobby.indexOf("const handleStartGame"), lobby.indexOf("enoughPlayersRef.current", lobby.indexOf("const handleStartGame")));
    expect(start).toMatch(/forgetDraftRoom\(currentRoom\.id\);/);
  });
});

describe("the back arrow on an abandoned draft", () => {
  const exit = lobby.slice(lobby.indexOf("const handleExitRoom"), lobby.indexOf('navigate("/team", { replace: true });', lobby.indexOf("const handleExitRoom")));

  it("deletes the row — only the host's own unsettled draft, not playing, alone in it", () => {
    expect(exit).toMatch(/isHost &&\s*\n\s*isDraftRoom\(currentRoom\.id\) &&\s*\n\s*!roomCreated &&\s*\n\s*currentRoom\.status !== "playing" &&\s*\n\s*participants\.every\(\(p\) => p\.user_id === user\?\.id\);/);
    expect(exit).toMatch(/void deleteDraftRoom\(draftId\);/);
    expect(exit).toMatch(/forgetDraftRoom\(draftId\);/);
  });

  it("and still leaves the room the ordinary way first", () => {
    expect(exit.indexOf("exitRoom();")).toBeLessThan(exit.indexOf("void deleteDraftRoom"));
  });

  it("drops the draft from both lists' caches before deleting, and refetches after", () => {
    // The lists remount as the lobby closes and ask the server in the same
    // tick as the delete; the Public list's answer raced it and won, and
    // showed the draft for the next twenty-five seconds. Cache first (fresh,
    // so the remount does not ask), then the row, then both lists again.
    const del = lobby.slice(lobby.indexOf("const deleteDraftRoom = async"), lobby.indexOf("};", lobby.indexOf("const deleteDraftRoom = async")));
    const drop = del.indexOf("queryClient.setQueryData<PublicRoom[]>(PUBLIC_ROOMS_KEY, (rooms) => rooms?.filter((r) => r.id !== id));");
    const dropMine = del.indexOf("queryClient.setQueriesData<MyRoom[]>({ queryKey: [MY_ROOMS_KEY] }, (rooms) => rooms?.filter((r) => r.id !== id));");
    const remove = del.indexOf('await supabase.from("game_rooms").delete().eq("id", id);');
    const again = del.indexOf("queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY })");
    const againMine = del.indexOf("queryClient.invalidateQueries({ queryKey: [MY_ROOMS_KEY] })");
    for (const at of [drop, dropMine, remove, again, againMine]) expect(at).toBeGreaterThan(-1);
    expect(drop).toBeLessThan(remove);
    expect(dropMine).toBeLessThan(remove);
    expect(remove).toBeLessThan(again);
    expect(remove).toBeLessThan(againMine);
    expect(del).toMatch(/if \(error\) console\.warn\("\[RoomLobbyV2\] draft room was not deleted:", error\.message\);/);
    expect(read("src/hooks/useMyRooms.ts")).toMatch(/export const MY_ROOMS_KEY = 'my-rooms' as const;/);
  });
});
