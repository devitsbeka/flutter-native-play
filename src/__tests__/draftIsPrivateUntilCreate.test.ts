/**
 * A draft is not on the Public list until Create makes it a room.
 *
 * "+ Room" on the Public tab inserted a public row and opened its lobby,
 * so the room sat on everybody's Public list from that moment — before a
 * category, before Create, a room nobody had built (owner: "when i click +
 * room, that room already exist on public list. i didn't add categories
 * and didn't click on create yet ... until i click create do not create
 * room and show on public list").
 *
 * So the row is born private on either tab. The Public tab's intent rides
 * in the draft store; the lobby reads it and shows the public rules; and
 * Create or Start is what flips is_public. Backing out still deletes the
 * draft (draftRoomIsNotKept.test), which nobody else ever saw.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The suite runs on node, with no DOM: the same in-memory storage shim the
// other draft tests install, before the module under test loads.
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

import {
  DRAFT_PUBLIC_KEY,
  DRAFT_ROOMS_KEY,
  draftWantsPublic,
  forgetDraftRoom,
  isDraftRoom,
  rememberDraftRoom,
} from "@/utils/roomCreateOffered";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hub = read("src/pages/TeamV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the draft store", () => {
  beforeEach(() => {
    localStorage.removeItem(DRAFT_ROOMS_KEY);
    localStorage.removeItem(DRAFT_PUBLIC_KEY);
  });

  it("remembers which drafts are to be published, and forgets both together", () => {
    rememberDraftRoom("pub", { publishAs: "public" });
    rememberDraftRoom("priv", { publishAs: "private" });
    rememberDraftRoom("bare");
    expect(isDraftRoom("pub")).toBe(true);
    expect(draftWantsPublic("pub")).toBe(true);
    expect(draftWantsPublic("priv")).toBe(false);
    expect(draftWantsPublic("bare")).toBe(false);
    forgetDraftRoom("pub");
    expect(isDraftRoom("pub")).toBe(false);
    expect(draftWantsPublic("pub")).toBe(false);
    expect(draftWantsPublic(null)).toBe(false);
  });

  it("re-remembering as private withdraws the intent", () => {
    rememberDraftRoom("r", { publishAs: "public" });
    rememberDraftRoom("r", { publishAs: "private" });
    expect(draftWantsPublic("r")).toBe(false);
  });
});

describe("+ Room", () => {
  it("makes the row private on either tab and stores the tab's intent", () => {
    expect(hub).toMatch(/\/\/ Private until Create publishes it \(draftWantsPublic\)\.\s*\n\s*false,\s*\n(\s*\/\/[^\n]*\n)*\s*isPublic,\s*\n(\s*\/\/[^\n]*\n)*\s*\{ publishAs: isPublic \? "public" : "private" \},\s*\n\s*\);/);
    expect(hub).toMatch(/rememberDraftRoom\(room\.id, \{ publishAs: isPublic \? "public" : "private" \}\);/);
  });
});

describe("the lobby", () => {
  it("treats a public draft as public: rules, counting, the door", () => {
    // One predicate for the kind now, shared with the private list and the
    // door (roomKindIsStrict.test.ts): a public draft is public here too.
    expect(lobby).toMatch(/const isPublicRoom = roomIsPublicKind\(currentRoom\) \|\| publishedNow;/);
    expect(read("src/utils/roomKind.ts")).toMatch(/return room\.is_public === true \|\| roomWantsPublic\(room\);/);
  });

  it("publishes the draft on Create and on Start, and lands Create on the list it published to", () => {
    // Settles the draft on the row and publishes it if the Public tab made
    // it; null when the write failed (draftsLiveOnTheRow.test.ts).
    expect(lobby).toMatch(/const publishDraft = async \(\): Promise<boolean \| null> => \{/);
    expect(lobby).toMatch(/\.\.\.\(wantsPublic && !alreadyPublic \? \{ is_public: true \} : \{\}\),/);
    // `.select("id")` on it: PostgREST reports NO error for an update that
    // matched no row, so the write is checked by what came back, not by the
    // absence of a complaint (createIsNotGatedOnThePlayerList.test.ts).
    expect(lobby).toMatch(
      /const \{ data: settled, error \} = await supabase\s*\n\s*\.from\("game_rooms"\)\s*\n\s*\.update\(patch\)\s*\n\s*\.eq\("id", currentRoom\.id\)\s*\n\s*\.select\("id"\);/,
    );
    const create = lobby.slice(lobby.indexOf("const handleDoneCreating"), lobby.indexOf("};", lobby.indexOf("const handleDoneCreating")));
    // Declared above the try that calls it — a throw here used to be an
  // unhandled rejection over a closed sheet, which is a tap that did nothing.
    expect(create).toMatch(/isPublic = await publishDraft\(\);/);
    expect(create.indexOf("await publishDraft()")).toBeLessThan(create.indexOf("forgetDraftRoom("));
    expect(create).toMatch(/navigate\(`\/team\?tab=\$\{isPublic \? "public" : "private"\}`, \{ replace: true \}\);/);
    const start = lobby.slice(lobby.indexOf("const handleStartGame"), lobby.indexOf("enoughPlayersRef.current", lobby.indexOf("const handleStartGame")));
    expect(start).toMatch(/if \(\(await publishDraft\(\)\) === null\) return;\s*\n\s*forgetDraftRoom\(currentRoom\.id\);/);
  });
});
