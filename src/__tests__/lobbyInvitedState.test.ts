/**
 * An invitation is not a player yet, and it looks like it.
 *
 * The players list drew somebody who had been asked exactly like somebody
 * who had arrived — same face, same colours — with only a dimmed row to
 * tell them apart. So a host could not see who they were waiting for
 * (owner: "when I invite a friend it should say invited and the avatar in
 * black and white; when they join, remove the 'invited' and show the
 * avatar in colour").
 *
 * Their face is greyed while the invitation is outstanding and comes up in
 * colour the moment they arrive, which is the same treatment a player who
 * has gone offline already gets — for the same reason: the seat is theirs,
 * they are just not in it.
 *
 * The pill is a standing state, not one of the moment's notes. It holds
 * for as long as the invitation does; "joined" and "left" spring in and
 * fade, and while one of those is showing it has the row to itself.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("somebody asked but not here", () => {
  it("wears their face in grey", () => {
    expect(lobby).toMatch(/player\.pending && "opacity-45 grayscale"/);
    // The same treatment as a player who is away, and for the same reason.
    expect(lobby).toMatch(/player\.offline && "opacity-45 grayscale"/);
  });

  it("and is labelled, for as long as the invitation stands", () => {
    expect(lobby).toMatch(/\{player\.pending && !player\.note && \(/);
    expect(lobby).toMatch(/\{invitedLabel\}/);
    expect(lobby).toMatch(/invitedLabel: string;/);
    expect(lobby).toMatch(/invited\?: string;/);
    expect(lobby.match(/invitedLabel=\{labels\.invited \?\? "invited"\}/g) ?? []).toHaveLength(2);
  });

  it("in the reader's language", () => {
    expect(room).toMatch(/invited: t\("lobby\.uInvitedNote"\),/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`)).toMatch(/uInvitedNote: "[^"]+",/);
    }
  });

  it("and the label goes when they arrive", () => {
    // `pending` is the room's own status — nothing else has to be cleared.
    expect(room).toMatch(/pending: \(p\.status as string\) === "invited",/);
  });
});
