/**
 * A private room is a draft until the lobby's Create, whichever door it
 * came through.
 *
 * "+ Room" was the only door that made a draft (draftRoomIsNotKept.test):
 * a private room born from the play chooser — a category, a custom
 * trivia, a My Trivia Party — or from the My Trivias tab was a room the
 * moment it was inserted, and the lobby's back arrow, which deletes an
 * abandoned draft, kept it. A host who looked at the lobby and changed
 * their mind found a room on their list they never made (owner: "we need
 * to have same approach when players creating private rooms. if player
 * clicks back button room shouldn't be created. room will create only
 * after player clicks create not with clicking back button in room
 * lobby, player can change their mind and click back not create, we
 * shouldn't create room in that case").
 *
 * So every private creation path marks the row a draft — on the row
 * (is_draft) and on the device — and the lobby's existing rule takes it
 * from there: Create or Start settles it, back while alone deletes it. A
 * PUBLISHED room from the chooser is not a draft: its Create was the
 * chooser's own, and the lobby already counts a published row as created.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The suite runs on node, with no DOM: the same in-memory storage shim
// the other draft tests install, before the module under test loads.
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

const { draftWantsPublic, isDraftRoom, privateDraft, rememberPrivateDraft } = await import("@/utils/roomCreateOffered");

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const tab = read("src/components/social/MyTriviaTab.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the helpers", () => {
  it("a private room gets the draft; a published one does not", () => {
    expect(privateDraft(false)).toEqual({ publishAs: "private" });
    expect(privateDraft(true)).toBeUndefined();
  });

  it("and the device remembers only the private one, never as public-to-be", () => {
    rememberPrivateDraft("pub-1", true);
    expect(isDraftRoom("pub-1")).toBe(false);
    rememberPrivateDraft("priv-1", false);
    expect(isDraftRoom("priv-1")).toBe(true);
    expect(draftWantsPublic("priv-1")).toBe(false);
  });
});

describe("the play chooser", () => {
  it("marks both direct inserts — the My Trivias tile and a trivia just written — on the row and the device", () => {
    const inserts = create.match(/\.\.\.\(publishRoom \? \{\} : await roomDraftFields\(true, false\)\),/g) ?? [];
    expect(inserts).toHaveLength(2);
    const remembered = create.match(/rememberPrivateDraft\(createdRoom\.id, publishRoom\);/g) ?? [];
    expect(remembered).toHaveLength(2);
  });

  it("and both createRoom calls — the custom fallback and a category", () => {
    const drafts = create.match(/undefined,\s*\n\s*privateDraft\(publishRoom\),\s*\n\s*\);/g) ?? [];
    expect(drafts).toHaveLength(2);
    const remembered = create.match(/if \(room\?\.id\) \{\s*\n\s*rememberPrivateDraft\(room\.id, publishRoom\);\s*\n\s*await persistQueuedRounds\(room\.id\);/g) ?? [];
    expect(remembered).toHaveLength(2);
  });
});

describe("the My Trivias tab", () => {
  it("every room it makes is a private draft, remembered on the device", () => {
    const drafts = tab.match(/undefined,\s*\n\s*false,\s*\n\s*undefined,\s*\n(\s*\/\/[^\n]*\n)*\s*\{ publishAs: "private" \},\s*\n\s*\);/g) ?? [];
    expect(drafts).toHaveLength(3);
    const remembered = tab.match(/if \(room\?\.id && room\?\.room_code\) \{\s*\n\s*rememberDraftRoom\(room\.id, \{ publishAs: "private" \}\);/g) ?? [];
    expect(remembered).toHaveLength(3);
  });
});

describe("the lobby's rule is the one that already exists", () => {
  it("back while alone on an unsettled draft deletes the row; Create and Start settle it", () => {
    expect(lobby).toMatch(/roomIsDraft\(currentRoom\) &&\s*\n\s*!roomCreated &&/);
    expect(lobby).toMatch(/void deleteDraftRoom\(draftId\);/);
    expect((lobby.match(/forgetDraftRoom\(currentRoom\??\.id\);/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
