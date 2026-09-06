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
    const scroller = modal.indexOf("min-h-0 max-h-[400px] flex-1 overflow-y-auto");
    const add = modal.indexOf('t("lobby.uAddRounds")');
    const scrollerEnd = modal.indexOf("</Reorder.Group>");
    expect(scroller).toBeGreaterThan(-1);
    expect(add).toBeGreaterThan(scrollerEnd);
    // Its own row, outside the scrolling box. (No home-indicator clearance
    // any more: the list is a panel under the chip, not a page.)
    expect(modal).toMatch(/className="shrink-0 px-4 pb-4 pt-2"/);
  });

  it("and the rounds are what scrolls", () => {
    expect(modal).toMatch(/min-h-0 max-h-\[400px\] flex-1 overflow-y-auto/);
  });
});

describe("a list longer than the panel says so", () => {
  it("the panel is as tall as the screen allows, not 60dvh", () => {
    const universal = read("src/components/lobby/UniversalLobby.tsx");
    expect(universal).toMatch(/max-h-\[calc\(100dvh_-_var\(--safe-top,0px\)_-_var\(--safe-bottom,0px\)_-_145px\)\] flex-col overflow-hidden rounded-\[22px\]/);
    expect(universal).not.toMatch(/max-h-\[60dvh\]/);
  });

  it("six rows, then it scrolls", () => {
    expect(modal).toMatch(/export const LIST_MAX_ROWS = 6;/);
    expect(modal).toMatch(/className="min-h-0 max-h-\[400px\] flex-1 overflow-y-auto px-4 pb-3"/);
    // The hint is in the fixed header, so the scroller holds rows only.
    const header = modal.slice(modal.indexOf('{t("lobby.uRoundsTitle")}'), modal.indexOf("<div ref={scrollerRef}"));
    expect(header).toMatch(/uRoundsHint/);
  });

  it("the grip is the handle, so a finger elsewhere scrolls", () => {
    // touch-action: none on the whole row made every touch a drag and the
    // list impossible to scroll (owner). Only the grip starts a drag now.
    const row = modal.slice(modal.indexOf("<Reorder.Item"), modal.indexOf("</Reorder.Item>"));
    expect(row).not.toMatch(/touchAction: canEdit/);
    expect(row).toMatch(/onPointerDown=\{\(e\) => controls\.start\(e\)\}\s*\n\s*style=\{\{ touchAction: "none" \}\}/);
    expect(row).toMatch(/h-10 w-10 shrink-0 cursor-grab/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/uRoundsDrag: "/);
    }
  });

  it("and pages with arrows too", () => {
    expect(modal).toMatch(/const \[more, setMore\] = useState\(\{ up: false, down: false \}\);/);
    expect(modal).toMatch(/el\.addEventListener\("scroll", measure, \{ passive: true \}\);/);
    expect(modal).toMatch(/new ResizeObserver\(measure\)/);
    expect(modal).toMatch(/\{more\.down && \(\s*\n\s*<PageArrow dir=\{1\}/);
    expect(modal).toMatch(/\{more\.up && \(\s*\n\s*<PageArrow dir=\{-1\}/);
    expect(modal).toMatch(/scrollBy\(\{ top: dir \* ROW_STRIDE \* 3, behavior: "smooth" \}\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/uRoundsMoreBelow: "/);
      expect(src, lang).toMatch(/uRoundsMoreAbove: "/);
    }
  });
});

describe("a category icon that fails cannot blank the app", () => {
  it("DynamicIcon calls every hook before its first early return", () => {
    // handleImageError's useCallback sat AFTER the direct-slug <img> branch.
    // A direct asset that 404ed changed the number of hooks between renders,
    // React threw, and the error boundary blanked the whole lobby over one
    // icon — found by rendering the round list in the sandbox.
    const icon = read("src/components/shared/DynamicIcon.tsx");
    const hook = icon.indexOf("const handleImageError = React.useCallback(");
    const firstReturn = icon.indexOf("\n  if (directUrl) {");
    expect(hook).toBeGreaterThan(-1);
    expect(firstReturn).toBeGreaterThan(-1);
    expect(hook).toBeLessThan(firstReturn);
  });
});
