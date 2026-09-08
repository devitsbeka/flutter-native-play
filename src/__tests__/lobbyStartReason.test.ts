/**
 * A room says how many people are in it, and a dead Start says why.
 *
 * The owner sat in a lobby reading "3/10 players" with a Start button that
 * did nothing, and asked why. Two separate things were wrong.
 *
 * The number was not the number the button judges. `capacity.taken` counts
 * seats spoken for, invitations included, and starting counts people who
 * can ANSWER — a host alone with two invitations out is one answerer, and
 * the room needs two. So the headline said three while the gate said one,
 * and nothing on screen connected them.
 *
 * And the reason was drawn under the button. The footer sits at the bottom
 * of the screen, so an explanation below a 60px button is the first thing
 * to fall off the edge — exactly when it is needed. It goes above now,
 * where the button cannot push it out of view. A caption on an ENABLED
 * button is not a blocker (a guest's "waiting for the host") and stays
 * where it was drawn.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("the count on screen is the count the button judges", () => {
  it("the headline shows the people who are here", () => {
    expect(lobby).toMatch(/seated\?: number;/);
    expect(lobby).toMatch(/Math\.min\(capacity\.seated \?\? capacity\.taken, capacity\.max\)/);
  });

  it("and the room hands it the seated count, not the seats spoken for", () => {
    expect(room).toMatch(/seated: seatedPlayers,/);
    // `taken` still counts invitations — that is what fills the room and
    // decides whether there is space to invite anyone else.
    expect(room).toMatch(/taken: participants\.length,/);
    expect(room).toMatch(
      /const seatedPlayers = participants\.filter\(\(p\) => \(p\.status as string\) !== "invited"\)\.length;/,
    );
  });

  it("and the gate itself is unchanged: two answerers", () => {
    expect(room).toMatch(/const enoughPlayers = answeringPlayers >= 2;/);
    expect(room).toMatch(/rlNeedsSecondPlayer/);
  });
});

describe("a disabled Start says why, where it can be seen", () => {
  it("the reason is drawn above the button, not under it", () => {
    expect(lobby).toMatch(/const captionBlock = start\.caption \? \(/);
    // Above when it is a blocker, below when it is not.
    const footer = lobby.slice(lobby.indexOf("{footerExtra}"));
    const above = footer.indexOf("{start.disabled && captionBlock}");
    const button = footer.indexOf("<motion.button");
    const below = footer.indexOf("{!start.disabled && captionBlock}");
    expect(above).toBeGreaterThan(-1);
    expect(above).toBeLessThan(button);
    expect(below).toBeGreaterThan(button);
  });

  it("and it carries its gap on the side it now sits", () => {
    // 12px, not 8: the footer floats over the list now, and the caption is
    // the line that has to separate the button from what is behind it.
    expect(lobby).toMatch(/start\.disabled\s*\n\s*\? "mb-3 px-2"/);
  });
});

describe("the room's name keeps clear of the screen edges", () => {
  it("fits inside a gutter rather than the whole width", () => {
    expect(lobby).toMatch(/const TITLE_GUTTER_PX = 24;/);
    expect(lobby).toMatch(/useFitOneLine\(name, 43\.656, 14, TITLE_GUTTER_PX\)/);
    expect(lobby).toMatch(/width - 2 \* gutterPx;/);
    // The floor is untouched: a very long name still shrinks to 14 rather
    // than being cut.
    expect(lobby).toMatch(/function useFitOneLine\(text: string, basePx: number, minPx: number, gutterPx = 0\)/);
  });
});
