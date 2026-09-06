/**
 * Scrolling is not tapping.
 *
 * The home feed is a wall of cards inside a vertical scroller, and every one
 * of them navigates on click. A thumb put down to stop a fling landed on
 * whichever card was under it and opened it — reported as "when I scroll the
 * page and my finger accidentally lands on any of the cards it goes there".
 *
 * iOS does this correctly in a UIScrollView and WebKit does not do it for a
 * web scroller, so the rule is restored in `scrollTapGuard`: a tap has to
 * land on a still page and end where it began. These cover the rule itself
 * and check that the app's two page scrollers actually apply it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  SETTLE_MS,
  TAP_SLOP_PX,
  isDeliberateTap,
  type Press,
} from "@/utils/scrollTapGuard";

/** A press on a page that has been still for a while and has not moved. */
const still: Press = { x: 100, y: 200, sinceScrollMs: Infinity, offsets: [400, 0] };

describe("a tap is a tap", () => {
  it("a press and release in the same spot on a still page", () => {
    expect(isDeliberateTap(still, { x: 100, y: 200, offsets: [400, 0] })).toBe(true);
  });

  it("a finger is never perfectly still — a few pixels is still a tap", () => {
    const drift = TAP_SLOP_PX - 1;
    expect(
      isDeliberateTap(still, { x: 100 + drift, y: 200 - drift, offsets: [400, 0] }),
    ).toBe(true);
  });

  it("a page that scrolled long enough ago has come to rest", () => {
    const rested = { ...still, sinceScrollMs: SETTLE_MS + 1 };
    expect(isDeliberateTap(rested, { x: 100, y: 200, offsets: [400, 0] })).toBe(true);
  });
});

describe("scrolling is not", () => {
  it("the finger that lands on a page still moving belongs to the scroller", () => {
    const onMomentum = { ...still, sinceScrollMs: SETTLE_MS - 1 };
    // Same spot, page never moved after the touch — iOS stopped the fling
    // dead. Only the timing gives it away, which is why it is checked.
    expect(isDeliberateTap(onMomentum, { x: 100, y: 200, offsets: [400, 0] })).toBe(false);
  });

  it("a finger that travelled was dragging", () => {
    expect(
      isDeliberateTap(still, { x: 100, y: 200 + TAP_SLOP_PX + 1, offsets: [400, 0] }),
    ).toBe(false);
    expect(
      isDeliberateTap(still, { x: 100 - TAP_SLOP_PX - 1, y: 200, offsets: [400, 0] }),
    ).toBe(false);
  });

  it("or the page moved under it, which is the same thing", () => {
    // The finger held its place on screen while the scroller kept going.
    expect(isDeliberateTap(still, { x: 100, y: 200, offsets: [372, 0] })).toBe(false);
  });

  it("a rail scrolling sideways counts too, not just the page", () => {
    // offsets are [scrollTop, scrollLeft] per scroller, innermost first.
    const inRail: Press = { ...still, offsets: [0, 120, 400, 0] };
    expect(isDeliberateTap(inRail, { x: 100, y: 200, offsets: [0, 168, 400, 0] })).toBe(false);
    expect(isDeliberateTap(inRail, { x: 100, y: 200, offsets: [0, 120, 400, 0] })).toBe(true);
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
