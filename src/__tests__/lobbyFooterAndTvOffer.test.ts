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

  it("with a blur that ramps, so it has no edge of its own", () => {
    // The haze is shared with the results screen now (FooterHaze); the
    // lobby draws it, and the layers live there.
    expect(lobby).toMatch(/<FooterHaze \/>/);
    const haze = readFileSync(join(process.cwd(), "src/components/shared/FooterHaze.tsx"), "utf8");
    // Every layer spans the whole ramp and fades ITSELF in over a different
    // stretch of it, so the radius climbs continuously from 2px to 26 and
    // no layer contributes an edge. Panes that merely START at different
    // heights turn one hard line into several, which is what this replaced.
    expect(haze).toMatch(/\{ blur: 2, from: 0, to: 25 \}/);
    expect(haze).toMatch(/\{ blur: 26, from: 70, to: 100 \}/);
    expect(haze).toMatch(/backdropFilter: `blur\(\$\{step\.blur\}px\)`/);
    expect(haze).toMatch(
      /WebkitMaskImage: `linear-gradient\(180deg, transparent \$\{step\.from\}%, #000 \$\{step\.to\}%\)`/,
    );
    // Masks are the mechanism, so every layer must carry one: an unmasked
    // layer is a uniform pane and brings its own edge back.
    const ramp = haze.slice(haze.indexOf("{ blur: 2, from: 0, to: 25 }"), haze.indexOf("The tint rides the same ramp"));
    expect((ramp.match(/blur: \d+/g) ?? []).length).toBe(4);
    // All four start at the same height — the mask does the ramping, not
    // the geometry.
    expect((ramp.match(/top-\[-120px\]/g) ?? []).length).toBe(1);
  });

  it("and the list stops clear of it, by measurement", () => {
    expect(lobby).toMatch(/paddingBottom: footerHeight/);
    expect(lobby).toMatch(/new ResizeObserver\(read\)/);
    // Measured, not a constant that goes stale when the caption wraps.
    expect(lobby).not.toMatch(/paddingBottom: \d/);
  });

  it("the caption line gets room around it, without the bar going tall", () => {
    expect(lobby).toMatch(/"mb-2 px-2"/);
    // 28px in either side, so the Start button lands where 1102:4561 draws
    // it — 444 wide in a 500 frame.
    expect(lobby).toMatch(/className="relative px-\[28px\] pb-\[14px\] pt-1\.5"/);
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

/**
 * The haze is allowed to blur what is BEHIND the list, not the end of it.
 *
 * The scroller was padded by the footer's measured height, but the blur
 * layers start 120px ABOVE the footer's own box — so scrolling to the end
 * parked the last row inside the ramp: on screen, and smeared (owner: "when
 * i scroll at the end blur covers last raw behind"). The padding has to
 * clear the ramp, not the footer.
 */
describe("the list ends clear of the haze, not just of the footer", () => {
  it("pads by the ramp as well as the measured footer", () => {
    expect(lobby).toMatch(/style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
  });

  it("and the constant is the same 120px the ramp is drawn with", () => {
    expect(lobby).toMatch(/const FOOTER_HAZE_PX = 120;/);
    // A Tailwind arbitrary value has to be a literal, so the two cannot be
    // written from one source — this is what keeps them equal. (How many
    // layers carry the class is the ramp's own test, above.)
    expect(lobby).toMatch(/top-\[-120px\]/);
  });
});

/**
 * Invite is above the benches, not under them.
 *
 * At the foot of the players tab it was the one control you had to scroll
 * to reach — and in a room full enough to need it, the row furthest down,
 * sitting in the footer's haze (owner: "show invite button above players
 * list to be visible"). It is also where 1123:8843 draws it.
 */
describe("the invite row comes before the players", () => {
  it("is rendered above the benches on the players tab", () => {
    const tab = lobby.slice(lobby.indexOf('key="players"'));
    const invite = tab.indexOf("<LobbyInviteRow");
    const benches = tab.indexOf('playersLayout === "columns"');
    expect(invite).toBeGreaterThan(-1);
    expect(benches).toBeGreaterThan(-1);
    expect(invite).toBeLessThan(benches);
  });

  it("and still goes when the room is full", () => {
    expect(lobby).toMatch(
      /\{onInvite && !\(capacity && capacity\.taken >= capacity\.max\) && \(\s*\n\s*<LobbyInviteRow faces=\{inviteFaces\}/,
    );
  });
});
