import type * as React from "react";

/**
 * A tap that lands on a moving page must not press what is under it.
 *
 * iOS gives you this for free inside a UIScrollView: the tap that arrests a
 * fling is eaten by the scroller and never reaches the row under the finger.
 * A web scroller gives you nothing of the sort — WebKit stops the momentum
 * and then delivers the click anyway — so on the home feed a thumb put down
 * to stop the scroll opened whichever card it happened to land on. Scrolling
 * past the play rail was a coin flip.
 *
 * This restores the native rule. A press counts as a tap only when it
 *
 *   - landed on a page that had already come to rest, and
 *   - ended within a few pixels of where it began, on scrollers that did not
 *     move underneath it.
 *
 * Everything else is scrolling, and scrolling is not a tap.
 *
 * Spread `scrollTapGuard()` onto a scroll container: it judges every click
 * inside it in the capture phase, so a stray one is stopped before any card
 * hears about it. Nothing inside has to know it is there.
 */

/** How long after the last scroll the page still counts as moving. */
export const SETTLE_MS = 150;

/** How far a finger may travel between press and release and still be a tap. */
export const TAP_SLOP_PX = 12;

export interface Press {
  x: number;
  y: number;
  /**
   * How long the scrollers above the pressed element had been still when the
   * finger landed. `Infinity` when none of them had ever scrolled.
   */
  sinceScrollMs: number;
  /** Their scroll offsets at that moment. */
  offsets: readonly number[];
}

export interface Release {
  x: number;
  y: number;
  offsets: readonly number[];
}

/**
 * Was this press-and-release a tap, or part of a scroll?
 *
 * Pure, so the rule itself can be tested without a browser — the DOM half
 * below only gathers the two samples and acts on the answer.
 */
export function isDeliberateTap(press: Press, release: Release): boolean {
  // The finger came down while the page was still moving. That tap belongs
  // to the scroller, which it stops; it was never meant for the card.
  if (press.sinceScrollMs < SETTLE_MS) return false;
  // It travelled — a drag, however short.
  if (Math.abs(release.x - press.x) > TAP_SLOP_PX) return false;
  if (Math.abs(release.y - press.y) > TAP_SLOP_PX) return false;
  // Or the page moved under it, which is the same thing seen from the page:
  // momentum still bleeding off, or a scroll the finger itself started.
  return (
    press.offsets.length === release.offsets.length &&
    press.offsets.every((offset, i) => offset === release.offsets[i])
  );
}

// ── The DOM half ────────────────────────────────────────────────────────────

const SCROLLS = /auto|scroll|overlay/;

const lastScrollAt = new WeakMap<EventTarget, number>();
let tracking = false;

/**
 * One capturing listener stamps every scroller in the document as it moves.
 * `scroll` does not bubble, but it does capture, so the document sees them
 * all — and a WeakMap keyed on the element keeps each scroller's own history
 * apart. A rail settling is not the page settling.
 */
function trackScrolls(): void {
  if (tracking || typeof document === "undefined") return;
  tracking = true;
  document.addEventListener(
    "scroll",
    (e) => {
      if (e.target) lastScrollAt.set(e.target, performance.now());
    },
    { capture: true, passive: true },
  );
}

/** The scrollable boxes between the pressed element and the root. */
function scrollersAbove(el: Element | null): Element[] {
  const out: Element[] = [];
  for (let n: Element | null = el; n; n = n.parentElement) {
    const style = getComputedStyle(n);
    if (SCROLLS.test(style.overflowY) || SCROLLS.test(style.overflowX)) out.push(n);
  }
  return out;
}

const offsetsOf = (els: readonly Element[]): number[] =>
  els.flatMap((el) => [el.scrollTop, el.scrollLeft]);

// One finger at a time: the press being judged is always the last one down.
let press: (Press & { scrollers: Element[] }) | null = null;

export function scrollTapGuard(): {
  onPointerDownCapture: (e: React.PointerEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
} {
  return {
    onPointerDownCapture: (e) => {
      trackScrolls();
      const scrollers = scrollersAbove(e.target as Element | null);
      const now = performance.now();
      press = {
        x: e.clientX,
        y: e.clientY,
        // A wheel leaves the same trail as a fling but no momentum to
        // arrest, and a click straight after one is deliberate. Only a
        // finger is held to the settling rule.
        sinceScrollMs:
          e.pointerType === "mouse"
            ? Infinity
            : Math.min(Infinity, ...scrollers.map((s) => now - (lastScrollAt.get(s) ?? -Infinity))),
        offsets: offsetsOf(scrollers),
        scrollers,
      };
    },
    onClickCapture: (e) => {
      const p = press;
      press = null;
      // Enter or Space on a focused card arrives as a click with no press
      // behind it (detail 0), and is never a stray finger.
      if (!p || e.detail === 0) return;
      if (isDeliberateTap(p, { x: e.clientX, y: e.clientY, offsets: offsetsOf(p.scrollers) })) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
