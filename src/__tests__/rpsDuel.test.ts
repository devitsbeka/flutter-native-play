/**
 * The captains' duel: the opener that decides who picks the first category.
 *
 * It was a two-row list floating on flat purple, with each captain's hand as
 * a 13px emoji pinned to the corner of a 32px avatar — and for everyone but
 * you that emoji was a ✅, so the one thing the phase exists to show was
 * never shown at all. The board's banner afterwards drew the two hands at
 * 22px, which is the only place the room learns HOW it was won.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const match = read("src/components/team-battle/TeamBattleMatch.tsx");
const rps = match.slice(match.indexOf("function PhaseRps"), match.indexOf("function PhaseBoard"));

describe("the duel is played on a light stage", () => {
  it("one surface, not three white cards floating on purple", () => {
    expect(rps).toMatch(/rounded-t-\[28px\] bg-\[#f5f2fa\]/);
    // The picker sheet had its own lilac ground; it is on the same one now.
    expect(rps).not.toMatch(/w-full shrink-0 bg-\[#f5f2fa\] rounded-t-\[28px\]/);
    // Dark ink on it, not the white that was drawn for purple.
    expect(rps).toMatch(/text-\[26px\] capitalize leading-\[32px\][^"]*text-\[#402666\]/);
    expect(rps).not.toMatch(/text-3xl font-black text-white/);
  });

  it("the captains face each other, with the VS between", () => {
    expect(rps).toMatch(/grid-cols-\[1fr_auto_1fr\] items-start/);
    expect(rps).toMatch(/<CaptainSide team="a" \/>/);
    expect(rps).toMatch(/<CaptainSide team="b" \/>/);
  });

  it("the faces are 15% bigger than the 32px they were", () => {
    // cn() lets className win over the size preset (see SmartAvatar).
    expect(rps).toMatch(/className="w-\[37px\] h-\[37px\]"/);
  });
});

describe("the hands turn over together", () => {
  it("nothing is revealed until both are in", () => {
    // Whoever threw second could otherwise read the winning counter off the
    // screen.
    expect(rps).toMatch(/const bothIn = !!throwOf\(capA\) && !!throwOf\(capB\);/);
    expect(rps).toMatch(/const shown = bothIn \? live : stale;/);
    // Locked-in is a mark, not the gesture, and not a ✅ emoji.
    expect(rps).toMatch(/<Check className="h-7 w-7 text-\[#7126d5\]"/);
    expect(rps).not.toMatch(/"✅"/);
  });

  it("and then they are big enough to see", () => {
    // 62px under the face, where a 13px emoji used to hang off its corner.
    expect(rps).toMatch(/h-\[62px\] w-\[62px\] object-contain/);
    expect(rps).not.toMatch(/absolute -bottom-1 -right-1 text-\[13px\]/);
  });

  it("the board's banner says how the opener was won, legibly", () => {
    const board = match.slice(match.indexOf("function PhaseBoard"));
    expect(board).toMatch(/<GestureIcon g=\{rpsLast\.team_a\} size=\{34\} \/>/);
    expect(board).toMatch(/<GestureIcon g=\{rpsLast\.team_b\} size=\{34\} \/>/);
    // And it stands until the first tile is claimed, so nobody misses it.
    expect(board).toMatch(/rpsLast && !rpsLast\.tie && openingPick/);
  });
});
