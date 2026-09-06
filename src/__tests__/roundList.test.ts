/**
 * The rounds a room will play, said the same way twice.
 *
 * The lobby's chip and the round list worked out "what plays first" from
 * different places: the chip counted the round the ROOM is holding plus the
 * queue, the list showed the queue alone. A room with a category and eleven
 * queued topics therefore said "+11" on the chip — twelve rounds — over a
 * list numbered 1 to 11, and the two named different categories as round one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const modal = read("src/components/team/RoundOrderModal.tsx");

describe("one answer to what plays first", () => {
  it("is computed once and handed to both", () => {
    expect(lobby).toMatch(/const heldRound = \(currentRoom\.category_id \|\| currentRoom\.user_trivia_id\)/);
    expect(lobby).toMatch(/const totalRounds = \(heldRound \? 1 : 0\) \+ queue\.length;/);
    // The chip reads it rather than recomputing it.
    expect(lobby).toMatch(/const rounds = totalRounds;/);
    expect(lobby).toMatch(/const firstName = heldRound\s*\n\s*\? heldRound\.name/);
    // And so does the list.
    expect(lobby).toMatch(/current=\{heldRound\}/);
    // The old parallel computation is gone.
    expect(lobby).not.toMatch(/const hasCurrent = !!\(currentRoom\.category_id/);
  });

  it("the room's held round is round 1, and the queue follows it", () => {
    expect(modal).toMatch(/current\?: \{ name: string; iconSlug\?: string \| null \} \| null;/);
    // Numbered after the pinned row, so the list never shows two round 1s.
    expect(modal).toMatch(
      /roundLabel=\{t\("lobby\.uRoundLabel", \{ count: index \+ 1 \+ \(current \? 1 : 0\) \}\)\}/,
    );
  });

  it("and it is pinned, not dragged — there is no queue row to move", () => {
    // It lives on the room, not in room_category_queue: a drag or an X would
    // have nothing to write.
    const pinned = modal.slice(modal.indexOf("{current && ("), modal.indexOf("<Reorder.Group"));
    expect(pinned).not.toMatch(/onRemove|GripVertical|dragControls/);
  });
});

describe("the way to add more never scrolls away", () => {
  it("Add sits under the scroller, not inside it", () => {
    const scroller = modal.indexOf("min-h-0 flex-1 overflow-y-auto");
    const add = modal.indexOf('t("lobby.uAddRounds")');
    const scrollerEnd = modal.indexOf("</Reorder.Group>");
    expect(scroller).toBeGreaterThan(-1);
    expect(add).toBeGreaterThan(scrollerEnd);
    // Its own row, outside the scrolling box. (No home-indicator clearance
    // any more: the list is a panel under the chip, not a page.)
    expect(modal).toMatch(/className="shrink-0 px-4 pb-4 pt-2"/);
  });

  it("and the rounds are what scrolls", () => {
    expect(modal).toMatch(/min-h-0 flex-1 overflow-y-auto/);
  });
});
