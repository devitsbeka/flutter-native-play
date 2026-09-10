/**
 * A room that has played keeps its visibility — and so does every room.
 *
 * A public room is made for one play and is wound down once that play is
 * over (public_room_is_over, #675). It stays on the host's own list in the
 * meantime, and the lobby's Public/Private switch let them make it private
 * again there - keeping for ever a room the server was about to close
 * (owner: "i see public room in private tab with ability to make it
 * private again, i shouldn't do that"). First the switch was taken from a
 * room that had played; then from every room: the tab a room is made from
 * decides (roomVisibilityFromTheTab.test.ts).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lobby = readFileSync(join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"), "utf8");

describe("the visibility switch", () => {
  it("is gone from the lobby altogether", () => {
    expect(lobby).not.toMatch(/key: "visibility"/);
    expect(lobby).not.toMatch(/setVisibility/);
    expect(lobby).not.toMatch(/roomVisibilityFields/);
  });

  it("the roster's round counts still say whether the table has played", () => {
    expect(lobby).toMatch(/const roomHasPlayed = participants\.some\(\(p\) => \(p\.total_rounds_played \?\? 0\) > 0\);/);
  });

  it("but the door stays: a public room between matches can still be knocked on", () => {
    // The Joining row is gated on being public, not on having played.
    expect(lobby).toMatch(/\.\.\.\(isHost && isPublicRoom && hasApprovalColumn && !playsOwnTrivia/);
    expect(lobby).not.toMatch(/isPublicRoom && hasApprovalColumn && !playsOwnTrivia && !roomHasPlayed/);
  });

  it("and the same fact drives the rematch ask", () => {
    expect(lobby).toMatch(/const isRematch = roomHasPlayed;/);
  });
});
