/**
 * The tab decides whether a room is public; the lobby does not ask again.
 *
 * "+ Room" on the Public tab and Create on the Private tab took one path
 * and made one kind of room — public, ask-me — and the lobby's Game Rules
 * then offered a Public/Private switch to undo it. Owner: "when i'm on
 * public tab and click + room remove public/private tabs, it will be
 * public, show questions per round and open/ask. when i'm on private tab
 * and click create room can't be public, remove public/private and show
 * questions per round and tv mode".
 *
 * So: the tab the host is standing on is the room's visibility, for good.
 * A public room's rules are the question count and the door (Open/Ask); a
 * private room's are the question count and Play on TV. No Visibility row
 * anywhere in the classic lobby. The battle arena keeps its own switch —
 * it is made from its own screen, not from these tabs.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hub = read("src/pages/TeamV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the room a tab makes", () => {
  it("is public from the Public tab, private from the Private tab, on both doors", () => {
    expect(hub).toMatch(/const createRoomAndOpen = async \(isPublic: boolean\) => \{/);
    // The + on the tab row and the chooser's Game Room card both read the tab.
    expect(hub).toMatch(/void createRoomAndOpen\(activeTab === "public"\);/);
    expect(hub).toMatch(/onSelectGameRoom=\{\(\) => void createRoomAndOpen\(activeTab === "public"\)\}/);
    expect(hub).not.toMatch(/createRoomAndOpen\(\)/);
  });

  it("has its door on the latch only when it is meant to be public — a private room has no door", () => {
    // The row itself is born private either way; the Public tab's intent
    // is published by Create (draftIsPrivateUntilCreate.test.ts).
    expect(hub).toMatch(/undefined,\s*\n(\s*\/\/[^\n]*\n)*\s*false,\s*\n(\s*\/\/[^\n]*\n)*\s*isPublic,\s*\n\s*\);/);
  });
});

describe("the lobby's rules", () => {
  it("carry no Visibility row and no way to write is_public", () => {
    expect(lobby).not.toMatch(/key: "visibility"/);
    expect(lobby).not.toMatch(/lobby\.uVisibility/);
    expect(lobby).not.toMatch(/setVisibility/);
    expect(lobby).not.toMatch(/roomVisibilityFields/);
  });

  it("a public room: the question count, and Open/Ask", () => {
    expect(lobby).toMatch(/key: "questions",/);
    expect(lobby).toMatch(/\.\.\.\(isPublicRoom && hasApprovalColumn && !playsOwnTrivia\s*\n\s*\? \[\{\s*\n\s*key: "joining",/);
  });

  it("a private room: the question count, and Play on TV", () => {
    expect(lobby).toMatch(/tv=\{isHost && !isPublicRoom \? \{ label: t\("lobby\.uPlayOnTv"\), onPress: \(\) => setIsTVModeEnabled\(true\) \} : undefined\}/);
  });
});

describe("the dev lobby shot", () => {
  it("draws the classic lobby without the row too", () => {
    const shot = read("src/dev/LobbyShot.tsx");
    const classic = shot.slice(shot.lastIndexOf("key: \"questions\""));
    expect(classic).not.toMatch(/visibility\(/);
  });
});
