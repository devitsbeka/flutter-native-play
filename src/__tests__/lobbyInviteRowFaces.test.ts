/**
 * An empty room looks empty.
 *
 * The lobby's invite line was drawn with the player's first three friends
 * beside the "+ Invite" button — decoration, straight from the design. But a
 * face on a lobby screen is a person in the room to anyone reading it, and
 * these wore exactly the players' own treatment: the same 36px circle, the
 * same gradient ring, and a GREY ring when the friend was offline — which is
 * the very treatment an invited-but-not-arrived player gets in the list
 * below.
 *
 * So a host who had just made a room for their own trivia opened the lobby
 * and found three friends apparently already invited to it (owner: "I
 * created a room to play my trivia party and I see there invited friends
 * already... I should invite friends myself from scratch in a new room I
 * just created"). Nothing had been invited and no row existed: the faces
 * were their friends list, rendered as furniture.
 *
 * Everyone actually in a room — invited included — is drawn in the players
 * list, which is the one place that means it. The invite line is a button.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Every lobby a player can actually reach. */
const LOBBIES = [
  "src/components/team/RoomLobbyV2.tsx",
  "src/pages/TeamBattlePage.tsx",
  "src/pages/KingPage.tsx",
  "src/components/team/CreateRoomPage.tsx",
];

describe("no lobby seats anybody it has not been given", () => {
  it("none of them hands the invite line a friends list", () => {
    for (const file of LOBBIES) {
      const src = read(file);
      // The exact shape that caused it: take the friends, sort the online
      // ones first, keep three, hand them over as faces.
      expect(src, file).not.toMatch(/inviteFaces=/);
      expect(src, file).not.toMatch(/\.slice\(0, 3\)\s*\n\s*\.map\(\(f\) => \(\{ url: f\.avatarUrl/);
    }
  });

  it("and the prop is optional, so a lobby has to opt in to draw a face", () => {
    const lobby = read("src/components/lobby/UniversalLobby.tsx");
    expect(lobby).toMatch(/inviteFaces\?: \{ url: string \| null; online\?: boolean \}\[\];/);
    expect(lobby).toMatch(/inviteFaces = \[\],/);
    // The row itself too — the arena renders it directly.
    expect(lobby).toMatch(/faces\?: \{ url: string \| null; online\?: boolean \}\[\];/);
    expect(lobby).toMatch(/faces = \[\],/);
  });

  it("while the players list still shows an invitation for what it is", () => {
    // The fix is about WHERE a face may appear, not about hiding invited
    // players: they keep their greyed seat and their label in the list.
    const lobby = read("src/components/lobby/UniversalLobby.tsx");
    expect(lobby).toMatch(/player\.pending && "opacity-45 grayscale"/);
    expect(lobby).toMatch(/\{invitedLabel\}/);
  });
});
