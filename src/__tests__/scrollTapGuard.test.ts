/**
 * Scrolling is not tapping — and a press is not a scroll.
 *
 * The home feed is a wall of cards inside a vertical scroller, and every one
 * of them navigates on click. A thumb put down to stop a fling landed on
 * whichever card was under it and opened it — reported as "when I scroll the
 * page and my finger accidentally lands on any of the cards it goes there".
 *
 * iOS does this correctly in a UIScrollView and WebKit does not do it for a
 * web scroller, so the rule is restored in `scrollTapGuard`: a tap has to
 * land on a still page and end where it began.
 *
 * The other half of the rule is newer and was learned the hard way. Judging
 * "did the page move?" without asking "did the POINTER move?" cannot tell a
 * page moving under a finger from a page moved BY the press — and pressing a
 * card moves the page, because focusing it scrolls it into view. The guard
 * was cancelling clicks it had provoked itself. So drift is only held against
 * a pointer that actually went somewhere.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OFFSET_SLOP_PX,
  SETTLE_MS,
  STILL_FINGER_PX,
  TAP_SLOP_PX,
  isDeliberateTap,
  type Press,
  type Release,
} from "@/utils/scrollTapGuard";

/** A press on a page that has been still for a while and has not moved. */
const still: Press = { x: 100, y: 200, sinceScrollMs: Infinity, offsets: [400, 0] };

/** A release, defaulting to a pointer that never budged. */
const at = (x: number, y: number, offsets: number[], maxTravelPx = 0): Release => ({
  x,
  y,
  offsets,
  maxTravelPx,
});

/** How far a pointer may stray and still have its drift judged. */
const WANDERED = STILL_FINGER_PX + 1;

describe("a tap is a tap", () => {
  it("a press and release in the same spot on a still page", () => {
    expect(isDeliberateTap(still, at(100, 200, [400, 0]))).toBe(true);
  });

  it("a finger is never perfectly still — a few pixels is still a tap", () => {
    const drift = TAP_SLOP_PX - 1;
    expect(isDeliberateTap(still, at(100 + drift, 200 - drift, [400, 0], drift))).toBe(true);
  });

  it("a page that scrolled long enough ago has come to rest", () => {
    const rested = { ...still, sinceScrollMs: SETTLE_MS + 1 };
    expect(isDeliberateTap(rested, at(100, 200, [400, 0]))).toBe(true);
  });

  it("a scroller that settled by a hair is still a still scroller", () => {
    // This comparison was exact, and a fractional settle — a rail
    // re-snapping, a rubber band finishing, a late image shifting the
    // layout — made the tap vanish with nothing to show for it. That is
    // what "I can't click it, and it keeps coming back" looks like.
    // Judged here against a pointer that wandered, or the rule below would
    // let these through without the slop being consulted at all.
    expect(isDeliberateTap(still, at(100, 200, [400.5, 0], WANDERED))).toBe(true);
    expect(isDeliberateTap(still, at(100, 200, [400 + OFFSET_SLOP_PX, 0], WANDERED))).toBe(true);
    // A pixel past the slop is a scroll again.
    expect(
      isDeliberateTap(still, at(100, 200, [400 + OFFSET_SLOP_PX + 1, 0], WANDERED)),
    ).toBe(false);
  });
});

/**
 * The press moves the page, and the guard used to hold that against it.
 *
 * Pressing a card in the play rail focuses it, and a freshly focused element
 * is scrolled into view. Inside a `snap-mandatory` rail that correction is
 * animated, so it swings out and comes back — measured in the browser as
 * scrollLeft 0 → 2 → 3 (click lands here) → 1 → 0. Three pixels, on a rail
 * that ended exactly where it started.
 *
 * A click held for a human length of time lands inside that wobble, so the
 * guard read the card's own focus scroll as "the page is moving" and
 * cancelled it: Quick Game needing several tries to open, and looking dead in
 * between (owner: "quick game becomes not clickable, maybe after 10 clicks it
 * may start"). A pointer that has not moved cannot have scrolled anything.
 */
describe("a scroll the press itself caused is not the page moving", () => {
  const wobble = [400, 3];

  it("a still pointer keeps its tap however the rail wobbles", () => {
    expect(isDeliberateTap({ ...still, offsets: [400, 0] }, at(100, 200, wobble))).toBe(true);
    // However far it swung: the size of a snap correction is the rail's
    // business, and none of it was the pointer's doing.
    expect(isDeliberateTap({ ...still, offsets: [400, 0] }, at(100, 200, [400, 60]))).toBe(true);
  });

  it("right up to the edge of holding still", () => {
    expect(isDeliberateTap({ ...still, offsets: [400, 0] }, at(100, 200, wobble, STILL_FINGER_PX)))
      .toBe(true);
    // Past it the pointer went somewhere, so the drift is its own again.
    expect(
      isDeliberateTap({ ...still, offsets: [400, 0] }, at(100, 200, wobble, STILL_FINGER_PX + 1)),
    ).toBe(false);
  });

  it("and a still pointer on a page that was ALREADY moving is still refused", () => {
    // The settling rule is untouched: this is the thumb arresting a fling,
    // which is the whole reason the guard exists.
    const onMomentum = { ...still, sinceScrollMs: SETTLE_MS - 1 };
    expect(isDeliberateTap(onMomentum, at(100, 200, [400, 0]))).toBe(false);
  });
});

describe("a scroll the app performs itself is not the page moving", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const guard = read("src/utils/scrollTapGuard.ts");

  it("the tracker ignores a marked scroller", () => {
    // Restoring the home feed fired scroll events for as long as the rails
    // took to load, and every one told the guard the page was moving — so
    // every tap on the home was swallowed for that whole window.
    expect(guard).toMatch(/export function markProgrammaticScroll/);
    expect(guard).toMatch(/if \(\(programmaticUntil\.get\(e\.target\) \?\? 0\) >= now\) return;/);
  });

  it("and the two places that scroll on their own say so", () => {
    expect(read("src/hooks/useScrollMemory.ts")).toMatch(/markProgrammaticScroll\(node\);/);
    expect(read("src/components/team/CreateRoomPage.tsx")).toMatch(/markProgrammaticScroll\(row\);/);
  });

  it("and travel is measured from the moves, not from the endpoints", () => {
    // The endpoints cannot see an excursion, which is the whole point.
    expect(guard).toMatch(/document\.addEventListener\("pointermove", onTravel/);
    expect(guard).toMatch(/travel = Math\.max\(\s*\n?\s*travel,/);
    expect(guard).toMatch(/watchTravel\(e\.clientX, e\.clientY\);/);
    expect(guard).toMatch(/maxTravelPx: travel,/);
    // And the listeners come off again, so an idle page carries none.
    expect(guard).toMatch(/document\.removeEventListener\("pointermove", onTravel, true\);/);
  });

  it("and the tracker is watching before the first press, not from it", () => {
    // It used to be installed inside onPointerDownCapture, so on the first
    // press of a page load it had recorded nothing: sinceScrollMs came out
    // Infinity and the settling rule could not fire — for the one press per
    // load most likely to be a thumb arresting a fling. Measured that way in
    // a browser: a tap onto a scroller mid-glide was judged perfectly still.
    const body = guard.slice(guard.indexOf("export function scrollTapGuard"));
    const install = body.indexOf("trackScrolls();");
    // Before the handlers are even built, not inside one of them.
    const handlers = body.indexOf("return {");
    expect(install).toBeGreaterThan(-1);
    expect(install).toBeLessThan(handlers);
  });
});

describe("scrolling is not", () => {
  it("the finger that lands on a page still moving belongs to the scroller", () => {
    const onMomentum = { ...still, sinceScrollMs: SETTLE_MS - 1 };
    // Same spot, page never moved after the touch — iOS stopped the fling
    // dead. Only the timing gives it away, which is why it is checked.
    expect(isDeliberateTap(onMomentum, at(100, 200, [400, 0]))).toBe(false);
  });

  it("a finger that travelled was dragging", () => {
    expect(isDeliberateTap(still, at(100, 200 + TAP_SLOP_PX + 1, [400, 0], TAP_SLOP_PX + 1))).toBe(
      false,
    );
    expect(isDeliberateTap(still, at(100 - TAP_SLOP_PX - 1, 200, [400, 0], TAP_SLOP_PX + 1))).toBe(
      false,
    );
  });

  it("including one that went and came back", () => {
    // Ends where it began, so the endpoints say it never moved — but it
    // dragged the page 28px on the way, and that was a scroll.
    expect(isDeliberateTap(still, at(100, 200, [372, 0], TAP_SLOP_PX + 1))).toBe(false);
  });

  it("or the page moved under a finger that was moving with it", () => {
    expect(isDeliberateTap(still, at(100, 200, [372, 0], WANDERED))).toBe(false);
  });

  it("a rail scrolling sideways counts too, not just the page", () => {
    // offsets are [scrollTop, scrollLeft] per scroller, innermost first.
    const inRail: Press = { ...still, offsets: [0, 120, 400, 0] };
    expect(isDeliberateTap(inRail, at(100, 200, [0, 168, 400, 0], WANDERED))).toBe(false);
    expect(isDeliberateTap(inRail, at(100, 200, [0, 120, 400, 0], WANDERED))).toBe(true);
  });
});

describe("the app's scrollers apply it", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("the home's own scroller (CLAUDE.md 4b: the page does not scroll, it does)", () => {
    const home = read("src/components/home/MobileHomeScroll.tsx");
    expect(home).toMatch(/from "@\/utils\/scrollTapGuard"/);
    expect(home).toMatch(/overflow-y-auto overscroll-contain" \{\.\.\.scrollTapGuard\(\)\}/);
  });

  it("and the scroller every other page renders into", () => {
    const layout = read("src/components/layout/MainLayout.tsx");
    expect(layout).toMatch(/from "@\/utils\/scrollTapGuard"/);
    // Both the standalone shell scroller and #main-scroll-container.
    expect(layout.match(/\{\.\.\.scrollTapGuard\(\)\}/g)).toHaveLength(2);
  });
});
