/**
 * Two lobby fixes from one screenshot (owner's ask).
 *
 * The tabs scrolled. With the rules running long, Game Rules / Players
 * rode up under the category chip's edge and out of reach; they are
 * sticky now, and since the chip lives outside the scroller they can never
 * slide under it ("make sure game rules and players tabs are sticky and do
 * not go under select category container").
 *
 * And the guest's footer read Leave, then Invite the host, then "Waiting
 * for the host…" — the way out first, the state last. State above the act:
 * the wait, the button that pokes the host, and the way out under both
 * ("switch places to leave room row and waiting for host row, show waiting
 * for host above invite host button").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");

describe("the tabs are sticky", () => {
  it("inside the body's scroller, a hair under the chip, over the rows, blurred", () => {
    // A hair under the chip's UNDERSIDE: the body runs up under the chip now,
    // so the offset is the chip's measured clearance plus 10 (lobbyTopHaze.test).
    // The sticky element is a wrapper now: the haze that rides behind the
    // bar, then the bar itself (lobbyTopHaze.test).
    expect(universal).toMatch(/<div className="sticky top-\[calc\(var\(--chip-clearance\)\+10px\)\] z-20">/);
    expect(universal).toMatch(/<div className="relative flex items-center gap-\[6px\] rounded-\[28px\] border border-\[#ceb8e4\] bg-\[rgba\(255,255,255,0\.77\)\] p-\[10px\] shadow-\[0px_8px_0px_0px_#d0bbe3\] backdrop-blur-md">/);
  });

  it("and the chip stays outside the scroller, so there is nothing to slide under", () => {
    const chip = universal.indexOf("ref={categoryRowRef}");
    // The chip is outside the scroller in the tree; the scroller runs up
    // under it by a measured clearance and the tabs offset by the same, so
    // they still never slide under the chip (lobbyTopHaze.test).
    const scroller = universal.indexOf('className="relative z-10 mt-[calc(var(--chip-clearance)*-1)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]"');
    expect(chip).toBeGreaterThan(-1);
    expect(chip).toBeLessThan(scroller);
  });
});

describe("the guest's footer: the wait, the button, the way out", () => {
  it("the shared lobby can draw the caption above a live button, and the extra below it", () => {
    expect(universal).toMatch(/captionAbove\?: boolean;/);
    expect(universal).toMatch(/footerExtraPlacement\?: "above" \| "below";/);
    const footer = universal.slice(universal.indexOf('{footerExtraPlacement === "above" && footerExtra}'));
    const captionAbove = footer.indexOf("{(start.disabled || start.captionAbove) && captionBlock}");
    const button = footer.indexOf("onClick={start.onPress}");
    const captionBelow = footer.indexOf("{!start.disabled && !start.captionAbove && captionBlock}");
    const extraBelow = footer.indexOf('{footerExtraPlacement === "below" && footerExtra}');
    expect(captionAbove).toBeLessThan(button);
    expect(button).toBeLessThan(captionBelow);
    expect(captionBelow).toBeLessThan(extraBelow);
  });

  it("and gives the caption air under it before the live button", () => {
    // Over a live button the line sat hard on the slab's top edge (owner:
    // "move up a little waiting for host row, needs breathing space below").
    expect(universal).toMatch(/: start\.captionAbove\s*\n(?:\s*\/\/.*\n)*\s*\? "mb-3 px-2"/);
  });

  it("the classic lobby asks for exactly that for a guest", () => {
    expect(lobby).toMatch(/caption: t\("team\.waitingForHost"\),\s*\n\s*captionPulse: true,[\s\S]*?captionAbove: true,/);
    expect(lobby).toMatch(/footerExtraPlacement="below"/);
  });

  it("the battle arena keeps its error above the button", () => {
    expect(battle).not.toMatch(/footerExtraPlacement/);
  });
});
