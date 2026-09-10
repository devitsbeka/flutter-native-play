/**
 * The online-room audit, phase D: the draft is a fact about the room, not
 * about the device — and the smaller things around the host's lobby.
 *
 *  - "+ Room" drafts and their publish intent go on game_rooms (is_draft,
 *    draft_public); the lobby reads the row first and this device's memory
 *    second, for a database the migration has not reached.
 *  - A failed publish is said, and neither Create nor Start settles over it.
 *  - The lobby stops believing a room is public once the row says so and
 *    then says otherwise (complete_room_round makes a public room private).
 *  - The rematch's Start recounts the table after the undecided leave.
 *  - Queue adds are serialised and positioned by the server.
 *  - Declining an invite from a card declines the invitation row too.
 *  - Entering a room leaves the one held first.
 *  - A level-up is paid once, by a partial unique index (the SQL test proves
 *    it; this checks the file and the CI step).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The helper reads localStorage at call time; node has none. The same
// in-memory stand-in draftRoomIsNotKept.test.ts uses.
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

const { roomIsDraft, roomWantsPublic, rememberDraftRoom, forgetDraftRoom, DRAFT_ROOMS_KEY, DRAFT_PUBLIC_KEY } =
  await import("@/utils/roomCreateOffered");

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const hub = read("src/pages/TeamV2.tsx");
const migration = read("supabase/migrations/20261106120000_drafts_on_the_row.sql");

describe("the row first, the device second", () => {
  it("a row that carries the columns is believed", () => {
    localStorage.removeItem(DRAFT_ROOMS_KEY);
    localStorage.removeItem(DRAFT_PUBLIC_KEY);
    expect(roomIsDraft({ id: "r", is_draft: true, draft_public: true })).toBe(true);
    expect(roomWantsPublic({ id: "r", is_draft: true, draft_public: true })).toBe(true);
    expect(roomWantsPublic({ id: "r", is_draft: true, draft_public: false })).toBe(false);
    // Settled: no longer a draft, whatever the intent column still says.
    expect(roomIsDraft({ id: "r", is_draft: false, draft_public: true })).toBe(false);
    expect(roomWantsPublic({ id: "r", is_draft: false, draft_public: true })).toBe(false);
    // Even over a device that remembers otherwise.
    rememberDraftRoom("r", { publishAs: "public" });
    expect(roomIsDraft({ id: "r", is_draft: false })).toBe(false);
    forgetDraftRoom("r");
  });

  it("a row from before the migration falls back to what the device remembers", () => {
    localStorage.removeItem(DRAFT_ROOMS_KEY);
    localStorage.removeItem(DRAFT_PUBLIC_KEY);
    expect(roomIsDraft({ id: "old" })).toBe(false);
    rememberDraftRoom("old", { publishAs: "public" });
    expect(roomIsDraft({ id: "old", is_draft: undefined })).toBe(true);
    expect(roomWantsPublic({ id: "old", is_draft: null })).toBe(true);
    forgetDraftRoom("old");
    expect(roomIsDraft(null)).toBe(false);
  });

  it("the columns exist, default false, and the write rides the insert only when they do", () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,/);
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS draft_public boolean NOT NULL DEFAULT false;/);
    const vis = read("src/utils/roomVisibility.ts");
    expect(vis).toMatch(/export async function roomDraftFields\(/);
    expect(vis).toMatch(/\.select\("is_draft"\)\.limit\(1\)/);
    expect(ctx).toMatch(/\.\.\.\(draft \? await roomDraftFields\(true, draft\.publishAs === "public"\) : \{\}\),/);
    expect(hub).toMatch(/\{ publishAs: isPublic \? "public" : "private" \},\s*\n\s*\);/);
  });
});

describe("Create and Start over a failed publish", () => {
  it("publishDraft settles the row and says when it could not", () => {
    expect(lobby).toMatch(/\.\.\.\(roomIsDraft\(currentRoom\) \? await roomDraftFields\(false\) : \{\}\),/);
    expect(lobby).toMatch(/toast\.error\(t\("extra\.errorOccurred"\)\);\s*\n\s*return null;/);
  });

  it("Create does not settle, and Start does not start", () => {
    const create = lobby.slice(lobby.indexOf("const handleDoneCreating"), lobby.indexOf("};", lobby.indexOf("const handleDoneCreating")));
    expect(create).toMatch(/const isPublic = await publishDraft\(\);\s*\n\s*if \(isPublic === null\) return;/);
    expect(create.indexOf("if (isPublic === null) return;")).toBeLessThan(create.indexOf("rememberPressedCreate("));
    const start = lobby.slice(lobby.indexOf("const handleStartGame"), lobby.indexOf("enoughPlayersRef.current", lobby.indexOf("const handleStartGame")));
    expect(start).toMatch(/if \(\(await publishDraft\(\)\) === null\) return;/);
  });

  it("the published-now bridge lets go once the row says public", () => {
    expect(lobby).toMatch(/if \(currentRoom\?\.is_public\) setPublishedNow\(false\);\s*\n\s*\}, \[currentRoom\?\.is_public\]\);/);
  });
});

describe("the rematch's Start", () => {
  it("recounts the table after the undecided leave, and does not start alone", () => {
    const start = lobby.slice(lobby.indexOf("const startWithWhoSaidYes"), lobby.indexOf("return (\n    <UniversalLobby"));
    expect(start).toMatch(/const staying = participants\.filter\(\(p\) => !gone\.has\(p\.id\) && \(p\.status as string\) !== "invited"\);/);
    expect(start).toMatch(/if \(staying\.length < 2\) \{\s*\n\s*toast\.error\(t\("extra\.rlNeedsSecondPlayer"\)\);\s*\n\s*return;\s*\n\s*\}/);
  });
});

describe("the queue", () => {
  it("adds one at a time, each positioned after the last row the server has", () => {
    const hook = read("src/hooks/useRoomCategoryQueue.ts");
    expect(hook).toMatch(/const addChain = useRef<Promise<unknown>>\(Promise\.resolve\(\)\);/);
    expect(hook).toMatch(/\.order\("position", \{ ascending: false \}\)\s*\n\s*\.limit\(1\)\s*\n\s*\.maybeSingle\(\);\s*\n\s*const nextPosition = \(last\?\.position \?\? -1\) \+ 1;/);
    expect(hook).toMatch(/const next = addChain\.current\.then\(run, run\);\s*\n\s*addChain\.current = next;/);
    expect(hook).not.toMatch(/const nextPosition = queue\.length;/);
  });
});

describe("one room at a time", () => {
  it("entering a room leaves the one held first", () => {
    expect(ctx).toMatch(/const held = currentRoomRef\.current;\s*\n\s*if \(held && held\.room_code !== roomCode\.toUpperCase\(\)\) \{/);
    const leave = ctx.slice(ctx.indexOf("const held = currentRoomRef.current;"), ctx.indexOf("setLoading(true);", ctx.indexOf("const held = currentRoomRef.current;")));
    expect(leave).toMatch(/cleanupChannels\(\);/);
    expect(leave).toMatch(/setState\(initialState\);/);
  });

  it("declining an invite from a card declines the invitation row too", () => {
    const invites = read("src/utils/pendingRoomInvites.ts");
    // Written together with the seat and the ask (inviteAnswersEveryNotice).
    expect(invites).toMatch(/\.from\("game_invitations"\)\s*\n\s*\.update\(\{ status: "declined" \}\)\s*\n\s*\.eq\("room_id", roomId\)\s*\n\s*\.eq\("receiver_id", userId\)\s*\n\s*\.eq\("status", "pending"\),\s*\n\s*\]\);/);
  });
});

describe("a level-up is paid once", () => {
  it("by a partial unique index on the reference the client sends", () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS currency_grants_level_up_reference_unique\s*\n\s*ON public\.currency_grants \(user_id, kind, reference\)\s*\n\s*WHERE kind = 'level_up' AND reference IS NOT NULL;/);
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/24-drafts-on-the-row.sql");
  });
});
