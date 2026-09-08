/**
 * Three things the lobby's foot was getting wrong.
 *
 * 1. The TV offer depended on which door you came through. Playing one of
 *    your own trivias from the My Trivias tab landed in the lobby with the
 *    "Play on TV" sheet open; building the same room from the play
 *    chooser's My Trivias tile landed with nothing, and the TV lives on the
 *    other tab where a host who has just arrived does not look.
 *
 * 2. The footer sat under the list as a flex sibling, so the card was cut
 *    off at a hard horizontal line — the Invite row sliced through its own
 *    glyphs — and the screen read as ending there. It floats over the list
 *    now, with a blurred haze, so the content visibly continues beneath it.
 *
 * 3. "Invite a friend — a game needs two players" was still the caption for
 *    a host who HAD invited somebody. The room is not short of an
 *    invitation then, it is short of an acceptance.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const createRoom = read("src/components/team/CreateRoomPage.tsx");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const roomLobby = read("src/components/team/RoomLobbyV2.tsx");

const LOCALES = ["en", "ka", "de", "es", "fr", "it", "pt"] as const;

describe("a room made from your own trivia offers the TV", () => {
  it("both personal-trivia handoffs carry tvMode", () => {
    const withTv = createRoom.match(/handoff\(`\/team\?join=\$\{roomCode\}&tvMode=true`/g);
    expect(withTv).toHaveLength(2);
  });

  it("and the ordinary category room still does not", () => {
    // The library/lounge walk-in is not a TV offer: nothing about a
    // category room says "put this on a television".
    expect(createRoom).toMatch(/handoff\(`\/team\?join=\$\{walkInCode\}`/);
    expect(createRoom).not.toMatch(/walkInCode\}&tvMode/);
  });
});

describe("the footer floats over the list", () => {
  it("anchored to the bottom rather than stacked under it", () => {
    expect(lobby).toMatch(/ref=\{footerRef\}[\s\S]{0,120}absolute inset-x-0 bottom-0 z-20/);
    // The old flex-sibling footer is gone.
    expect(lobby).not.toMatch(/className="relative z-20 shrink-0 px-4 pb-4"/);
  });

  it("with a blur, so what is behind it reads as content and not as an edge", () => {
    expect(lobby).toMatch(/backdrop-blur-\[12px\]/);
  });

  it("and the list stops clear of it, by measurement", () => {
    expect(lobby).toMatch(/paddingBottom: footerHeight/);
    expect(lobby).toMatch(/new ResizeObserver\(read\)/);
    // Measured, not a constant that goes stale when the caption wraps.
    expect(lobby).not.toMatch(/paddingBottom: \d/);
  });

  it("the caption line gets room around it", () => {
    expect(lobby).toMatch(/"mb-3 px-2"/);
  });
});

describe("the caption says which of the two things is missing", () => {
  it("nobody asked yet: invite somebody", () => {
    expect(roomLobby).toMatch(/t\("extra\.rlNeedsSecondPlayer"\)/);
  });

  it("somebody asked and has not answered: say that instead", () => {
    expect(roomLobby).toMatch(/invitedPlayers > 0/);
    expect(roomLobby).toMatch(/t\("extra\.rlWaitingOnInvites"\)/);
  });

  it("counted off the seat status, not off the participant count", () => {
    expect(roomLobby).toMatch(
      /const invitedPlayers = participants\.filter\(\(p\) => \(p\.status as string\) === "invited"\)\.length;/,
    );
  });

  it("both lines exist in all seven languages", () => {
    for (const locale of LOCALES) {
      const file = read(`src/locales/${locale}.ts`);
      expect(file, locale).toMatch(/rlNeedsSecondPlayer:/);
      expect(file, locale).toMatch(/rlWaitingOnInvites:/);
    }
  });
});
