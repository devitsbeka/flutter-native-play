import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

/**
 * "why private room shows open/ask me - it should show questions per round
 * and TV. what should we do to not mix them, we need strict rules for rooms
 * which are public and which are private" (owner).
 *
 * The kind was decided in three different ways. The chooser hard-wired
 * `isPublic = true`, so every library/Guess/Battle room it made was
 * published wherever it had been opened from; the rooms hub read the kind
 * off `activeTab`, which starts at "public" whenever the page is reached
 * without ?tab=; and the lobby, the private list and the door each derived
 * "is this public" separately. One predicate now, and the caller that
 * creates a room states the kind.
 */
describe("one predicate for the kind", () => {
  beforeEach(() => vi.resetModules());

  const load = async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    return await import("@/utils/roomKind");
  };

  it("a settled public row is public; a private one is not", async () => {
    const { roomIsPublicKind, roomKindOf } = await load();
    expect(roomIsPublicKind({ id: "a", is_public: true, is_draft: false, draft_public: false })).toBe(true);
    expect(roomIsPublicKind({ id: "b", is_public: false, is_draft: false, draft_public: false })).toBe(false);
    expect(roomKindOf({ id: "b", is_public: false, is_draft: false, draft_public: false })).toBe("private");
  });

  it("a public room still in draft is public already — it is simply not listed yet", async () => {
    const { roomIsPublicKind } = await load();
    expect(roomIsPublicKind({ id: "c", is_public: false, is_draft: true, draft_public: true })).toBe(true);
    // ...and a private draft is private, which is the case that was read
    // the wrong way round on the Private tab.
    expect(roomIsPublicKind({ id: "d", is_public: false, is_draft: true, draft_public: false })).toBe(false);
  });

  it("nothing is public by accident", async () => {
    const { roomIsPublicKind } = await load();
    expect(roomIsPublicKind(null)).toBe(false);
    expect(roomIsPublicKind(undefined)).toBe(false);
    // A row from before the draft migration: no columns, no device memory.
    expect(roomIsPublicKind({ id: "e" })).toBe(false);
  });
});

describe("the kind is stated by whoever creates the room", () => {
  const team = read("src/pages/TeamV2.tsx");
  const chooser = read("src/components/team/CreateRoomPage.tsx");

  it("the rooms hub takes it as an argument instead of reading the selected tab", () => {
    expect(team).toMatch(/const openCreateRoom = \(kind: "public" \| "private"\) => \{[\s\S]*?createRoomAndOpen\(kind === "public"\);/);
    expect(team).not.toMatch(/createRoomAndOpen\(activeTab === "public"\)/);
    expect(team).toMatch(/onAddClick=\{\(\) => openCreateRoom\("public"\)\}/);
    expect(team).toMatch(/onCreateRoom=\{\(\) => openCreateRoom\("private"\)\}/);
    expect(team).toMatch(/activeTab === "public" \? openCreateRoom\("public"\) : openCreateType\(\)/);
    // The Private tab's Create -> Game Room is private, always.
    expect(team).toMatch(/onSelectGameRoom=\{\(\) => \{[\s\S]*?void createRoomAndOpen\(false\);/);
  });

  it("the chooser is private unless the Public tab opened it", () => {
    expect(chooser).toMatch(/createsPublicRooms\?: boolean;/);
    expect(chooser).toMatch(/createsPublicRooms = false \}: CreateRoomPageProps\)/);
    expect(chooser).toMatch(/const isPublic = createsPublicRooms;/);
    expect(chooser).not.toMatch(/const isPublic = true;/);
    expect(team).toMatch(/createsPublicRooms=\{activeTab === "public"\}/);
    // The page at /create-room passes nothing, so it makes private rooms.
    expect(read("src/pages/CreateRoom.tsx")).not.toMatch(/createsPublicRooms/);
  });
});

describe("every surface reads that one predicate", () => {
  it("the lobby's rules follow the kind, so the two sets never mix", () => {
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    expect(lobby).toMatch(/const isPublicRoom = roomIsPublicKind\(currentRoom\) \|\| publishedNow;/);
    // Public: the door. Private: the question count and Play on TV.
    expect(lobby).toMatch(/\.\.\.\(isHost && isPublicRoom && hasApprovalColumn && !playsOwnTrivia/);
    expect(lobby).toMatch(/tv=\{isHost && !isPublicRoom \? \{ label: t\("lobby\.uPlayOnTv"\)/);
  });

  it("the private list judges by the kind, and a public room says so on its card", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(/result = result\.filter\(\(room\) => !roomIsPublicKind\(room\) \|\| room\.is_host\);/);
    expect(hook).toMatch(/is_draft: \(room as \{ is_draft\?: boolean \| null \}\)\.is_draft \?\? null,/);
    const section = read("src/components/team/MyRoomsSection.tsx");
    expect(section).toMatch(/\{roomIsPublicKind\(room\) && \(/);
    expect(section).toMatch(/\{t\("extra\.roomPublic"\)\}/);
  });

  it("the word is in all seven", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+roomPublic: "[^"]+",/);
    }
  });
});
