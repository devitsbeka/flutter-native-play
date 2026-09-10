/**
 * A room made from "+ Room" on the Public tab is public, with the door on
 * the latch.
 *
 * "+ Room" made a PRIVATE room, so the lobby's Visibility row opened on
 * "Private" and a host who wanted to be found had to notice a rule row on
 * the Game Rules tab and switch it — on the page whose whole point is rooms
 * other people can find. Published is the useful default; "Ask me" is what
 * keeps that safe, because a room that lists itself the moment it exists
 * should still let its host say who walks in (owner: "we should show public
 * always selected when user clicks + room ... show always public and ask me
 * - as selected").
 *
 * Since then the Visibility row has gone altogether: the tab decides
 * (roomVisibilityFromTheTab.test.ts). The door stays a row in the lobby.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hub = read("src/pages/TeamV2.tsx");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const visibility = read("src/utils/roomVisibility.ts");

describe("what + Room writes", () => {
  it("asks for both, in the order createRoom takes them", () => {
    // isPublic, then requiresApproval — the last two arguments, and the
    // door is on the latch exactly when the room is public.
    expect(hub).toMatch(/const createRoomAndOpen = async \(isPublic: boolean\) => \{/);
    // The room is born PRIVATE either way now — a public draft is published
    // by Create, not listed at birth (draftIsPrivateUntilCreate.test) — and
    // the door is on the latch exactly when it is meant to be public.
    expect(hub).toMatch(/undefined,\s*\n(\s*\/\/[^\n]*\n)*\s*false,\s*\n(\s*\/\/[^\n]*\n)*\s*isPublic,\s*\n(\s*\/\/[^\n]*\n)*\s*\{ publishAs: isPublic \? "public" : "private" \},\s*\n\s*\);/);
  });

  it("and it is no longer named after the private room it used to make", () => {
    expect(hub).not.toMatch(/createPrivateRoomAndOpen/);
  });

  it("both doors on the page take that one path, and the tab says which room", () => {
    // The + on the tab row, and the chooser's Game Room card.
    expect((hub.match(/void createRoomAndOpen\(activeTab === "public"\)/g) ?? []).length).toBe(2);
    expect(hub).not.toMatch(/void createRoomAndOpen\(\)/);
  });
});

describe("createRoom carries the door policy the same way it carries visibility", () => {
  it("takes it as an argument that defaults to open", () => {
    // Every caller that has no opinion — matchmaking, challenges, anything
    // added later — keeps making an open room, which is the column default.
    expect(ctx).toMatch(/requiresApproval = false,/);
    expect(ctx).toMatch(
      // ...and, after it, the "+ Room" draft, which is the ninth argument
      // TeamV2 passes (the type had lagged the implementation by one and
      // broke the typecheck on main).
      /createRoom: \(categoryId\?: string.*isPublic\?: boolean, requiresApproval\?: boolean, draft\?: \{ publishAs: "public" \| "private" \}\) => Promise<GameRoom \| null>;/,
    );
  });

  it("and writes it through the same probe the other late columns use", () => {
    expect(ctx).toMatch(/\.\.\.\(await roomVisibilityFields\(isPublic\)\),\s*\n\s*\.\.\.\(await roomApprovalFields\(requiresApproval\)\),/);
    expect(visibility).toMatch(/export async function roomApprovalFields\(/);
    expect(visibility).toMatch(/return \(await gameRoomsHasApproval\(\)\) \? \{ requires_approval: requiresApproval \} : \{\};/);
  });

  it("which means a database without the column still gets a room", () => {
    // Migrations here are pasted in by hand after the merge; naming an
    // unknown column would 400 the one insert room creation depends on.
    expect(visibility).toMatch(/export function gameRoomsHasApproval\(\): Promise<boolean>/);
  });
});

describe("the lobby's door row still decides, and still shows the truth", () => {
  it("the lobby reads the room's own column for what it is", () => {
    // ...or the draft store's intent for a draft the Public tab made, or a
    // publish that has just happened (draftIsPrivateUntilCreate.test).
    expect(lobby).toMatch(/const isPublicRoom =\s*\n\s*Boolean\(currentRoom\.is_public\) \|\|\s*\n\s*publishedNow \|\|\s*\n\s*roomWantsPublic\(currentRoom\);/);
  });

  it("Joining reads the room's column, and only on a room that has a door worth guarding", () => {
    expect(lobby).toMatch(/value: needsApproval \? "ask" : "open",/);
    expect(lobby).toMatch(/isPublicRoom && hasApprovalColumn && !playsOwnTrivia/);
  });

  it("and the host can still switch the door — the default is not a lock", () => {
    expect(lobby).toMatch(/onChange: isHost \? \(v: string\) => void setApproval\(v\) : undefined,/);
  });
});
