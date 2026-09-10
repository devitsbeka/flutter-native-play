/**
 * The lobby's reach spacer cannot grow from scrolling.
 *
 * The spacer under the card holds the scroll position through a tab
 * switch. It was sized from the LIVE scrollTop on every scroll event as
 * well, and a fractional scrollTop at the end of the list rounded up to
 * one more pixel of spacer per event — so the list could be scrolled
 * forever, a pixel at a time, the rows creeping up under the tabs (owner:
 * "i can scroll very very slowly and sticky tabs also goes under select
 * category container"). The live term is capped at the spacer's current
 * size now: scrolling up gives the room back, scrolling down adds none.
 *
 * And a My Trivia Party room is offered Create: the row-first "created"
 * rule applies to PUBLISHED rooms only, since a private room born outside
 * "+ Room" is not a draft and proves nothing by its row.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the reach spacer", () => {
  it("holds the switch position in full, and the live position only up to its own size", () => {
    expect(universal).toMatch(/const switching = keepScrollRef\.current \?\? 0;/);
    expect(universal).toMatch(/const live = Math\.min\(Math\.ceil\(scroller\.scrollTop - natural\), reachRef\.current\);/);
    expect(universal).toMatch(/return Math\.max\(0, Math\.ceil\(need - natural\), Math\.ceil\(switching - natural\), live\);/);
    expect(universal).not.toMatch(/Math\.max\(scroller\.scrollTop, keepScrollRef\.current \?\? 0\)/);
  });

  it("keeps its size in a ref the measure reads without depending on it", () => {
    expect(universal).toMatch(/const reachRef = useRef\(0\);/);
    expect(universal).toMatch(/const setReachSpacer = \(v: number\) => \{\s*\n\s*reachRef\.current = v;\s*\n\s*setReachSpacerState\(v\);\s*\n\s*\};/);
  });
});

describe("Create on a private room made outside + Room", () => {
  it("is decided by the device's memory, not the row", () => {
    expect(lobby).toMatch(/\(Boolean\(currentRoom\?\.is_public\) && typeof currentRoom\?\.is_draft === "boolean" && !currentRoom\.is_draft\)/);
  });
});
