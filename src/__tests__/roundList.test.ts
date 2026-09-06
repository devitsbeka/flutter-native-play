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
import { HELD_ID, planDrop, roundEntries } from "@/components/team/RoundOrderModal";

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

  it("the room's held round is round 1 of the SAME list, and the numbers run 1..N", () => {
    expect(modal).toMatch(/current\?: \{ name: string; iconSlug\?: string \| null \} \| null;/);
    // One list: the held round is an entry of it, not a pinned row above it.
    // Pinned, the list read 1, 1, 2, 3 (owner's screenshot).
    expect(modal).toMatch(/useState<RoundEntry\[\]>\(\(\) => roundEntries\(current, items\)\)/);
    expect(modal).toMatch(/number=\{index \+ 1\}/);
    expect(modal).toMatch(/roundLabel=\{t\("lobby\.uRoundLabel", \{ count: index \+ 1 \}\)\}/);
    expect(modal).not.toMatch(/count: index \+ 1 \+ \(current \? 1 : 0\)/);
  });

  it("and it can be dragged past — a queued round dropped above it is promoted", () => {
    // The held round is a row like the others: draggable, no X (there is no
    // queue row to delete).
    expect(modal).toMatch(/onRemove=\{isHeld\(entry\) \? undefined : \(\) => void onRemove\(entry\.id\)\}/);
    expect(modal).toMatch(/onPromote\?: \(item: QueueItem, queueIds: string\[\]\) => void \| Promise<unknown>;/);
    expect(lobby).toMatch(/onPromote=\{handlePromoteToFirst\}/);
    // The lobby gives the room the promoted round and writes the old held
    // round into the promoted row, in place, so the new order can name it.
    expect(lobby).toMatch(/await replaceQueueItem\(item\.id, wasHolding\);/);
    expect(lobby).toMatch(/await reorderQueue\(next\);/);
    expect(read("src/hooks/useRoomCategoryQueue.ts")).toMatch(/const replaceQueueItem = useCallback\(async \(/);
  });
});

describe("what a drop means", () => {
  const q = (id: string) => ({ id, category_name: id }) as unknown as import("@/hooks/useRoomCategoryQueue").QueueItem;
  const held = { id: HELD_ID, kind: "held", name: "Economics", iconSlug: null } as const;

  it("head still the held round: a plain reorder of the queue rows", () => {
    const plan = planDrop([held, q("b"), q("a")]);
    expect(plan.kind).toBe("reorder");
    if (plan.kind === "reorder") expect(plan.queue.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("no held round: the same", () => {
    const plan = planDrop([q("b"), q("a")]);
    expect(plan).toEqual({ kind: "reorder", queue: [q("b"), q("a")] });
  });

  it("a queued round on top: promote it, and the old held round takes its row", () => {
    const plan = planDrop([q("a"), held, q("b")]);
    expect(plan.kind).toBe("promote");
    if (plan.kind === "promote") {
      expect(plan.item.id).toBe("a");
      // The old held round is named by a's id — a's row is rewritten to hold it.
      expect(plan.queueIds).toEqual(["a", "b"]);
    }
  });

  it("dragged to the very bottom too", () => {
    const plan = planDrop([q("a"), q("b"), held]);
    if (plan.kind === "promote") expect(plan.queueIds).toEqual(["b", "a"]);
    else throw new Error("expected promote");
  });

  it("the entries are the held round then the queue", () => {
    expect(roundEntries({ name: "Economics" }, [q("a")]).map((e) => e.id)).toEqual([HELD_ID, "a"]);
    expect(roundEntries(null, [q("a")]).map((e) => e.id)).toEqual(["a"]);
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
