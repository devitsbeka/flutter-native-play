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

/**
 * How far a scroller may drift between press and release and still count as
 * still.
 *
 * This comparison used to be exact, and exactness is the wrong test: a
 * scroll offset is a fractional number, and a scroller can settle by a
 * fraction of a pixel — a rail re-snapping under the finger, a rubber band
 * finishing, a layout shift as a late image lands — after the press and
 * before the click. Any of those made the tap vanish with nothing to show
 * for it, which is what "I can't click it, and it keeps coming back" looks
 * like from the outside. A real scroll moves tens of pixels; two is noise.
 */
export const OFFSET_SLOP_PX = 2;

/**
 * How far the pointer may wander during a press and still count as held
 * still.
 *
 * This is what separates a page moving UNDER a finger from a page moved BY
 * the press, and the two are indistinguishable from the offsets alone.
 *
 * Pressing a card in the play rail focuses it, and the browser scrolls a
 * freshly focused element into view — inside a `snap-mandatory` rail that
 * correction is animated, so it swings out and settles back:
 *
 *     pointerdown   scrollLeft 0
 *     focusin       (the press focused the card)
 *     +76ms         scrollLeft 2
 *     +125ms        scrollLeft 3
 *     +161ms        click, scrollLeft 3   ← 3px of drift, and the tap died
 *     +243ms        scrollLeft 0          ← back where it began
 *
 * The rail never went anywhere; it wobbled because the card was pressed. A
 * click held for a human length of time (~150ms) lands mid-wobble, and the
 * guard cancelled it — the Quick Game card taking several tries to open,
 * reported as "quick game becomes not clickable". A pointer that has not
 * moved cannot have scrolled anything, so drift under a still pointer is
 * never the finger's doing and never cancels the tap.
 */
export const STILL_FINGER_PX = 6;

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
  /**
   * The furthest the pointer got from where it went down, at any point
   * during the press — not just where it ended up. A drag that returns to
   * its starting point is still a drag.
   */
  maxTravelPx: number;
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
  // It travelled — a drag, however short. Both where it ended up and the
  // furthest it got: a finger that dragged the page and came back to where
  // it started reads as motionless from the endpoints alone.
  if (Math.abs(release.x - press.x) > TAP_SLOP_PX) return false;
  if (Math.abs(release.y - press.y) > TAP_SLOP_PX) return false;
  if (release.maxTravelPx > TAP_SLOP_PX) return false;
  // The pointer held its place. Then nothing it did moved a scroller, and
  // whatever they did during the press is the press's own doing — the
  // browser scrolling the pressed card into view, a snap correction
  // settling. See STILL_FINGER_PX: cancelling the tap for that made the
  // card cancel itself.
  if (release.maxTravelPx <= STILL_FINGER_PX) return true;
  // It moved a little, so the page moving with it is the same thing seen
  // from the page: momentum still bleeding off, or a scroll it started.
  return (
    press.offsets.length === release.offsets.length &&
    press.offsets.every((offset, i) => Math.abs(offset - release.offsets[i]) <= OFFSET_SLOP_PX)
  );
}

// ── The DOM half ────────────────────────────────────────────────────────────

const SCROLLS = /auto|scroll|overlay/;

const lastScrollAt = new WeakMap<EventTarget, number>();
/** Scrollers the app is moving itself, and until when. */
const programmaticUntil = new WeakMap<EventTarget, number>();
let tracking = false;

/**
 * How long after a mark the scroll events from it are still expected. One
 * frame is the usual gap between an assignment and its event; a little more
 * covers a busy frame.
 */
const PROGRAMMATIC_GRACE_MS = 100;

/**
 * "The scroll you are about to see on this element is mine."
 *
 * The guard exists to spot a page moving UNDER a finger — momentum to
 * arrest, a drag in progress. A scroll the app performs itself is neither:
 * restoring the home feed to where the player left it (see useScrollMemory)
 * fired scroll events for as long as it took the rails to load, and every
 * one of them told the guard the page was still moving. Taps on the home
 * were swallowed for that whole window, which reads exactly like a dead
 * button.
 *
 * Call this immediately before assigning `scrollTop`/`scrollLeft`.
 */
export function markProgrammaticScroll(el: EventTarget | null | undefined): void {
  if (el) programmaticUntil.set(el, performance.now() + PROGRAMMATIC_GRACE_MS);
}

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
      if (!e.target) return;
      const now = performance.now();
      // Ours, not the finger's — see markProgrammaticScroll.
      if ((programmaticUntil.get(e.target) ?? 0) >= now) return;
      lastScrollAt.set(e.target, now);
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

/**
 * How far the pointer has strayed from where it went down.
 *
 * Sampled from `pointermove` rather than from the endpoints, because the
 * endpoints cannot see an excursion: a finger that drags the page and comes
 * back to where it started ends exactly where it began. Tracked only while a
 * button is down — the listeners go on at `pointerdown` and come off at
 * `pointerup`, so an idle page carries none.
 */
let travel = 0;
let travelFrom: { x: number; y: number } | null = null;

const onTravel = (e: PointerEvent): void => {
  if (!travelFrom) return;
  travel = Math.max(travel, Math.abs(e.clientX - travelFrom.x), Math.abs(e.clientY - travelFrom.y));
};

// `pointerup` runs before the click, so `travel` is final by the time the
// click is judged. Stopping only detaches; the value is read after.
const stopTravel = (): void => {
  travelFrom = null;
  document.removeEventListener("pointermove", onTravel, true);
  document.removeEventListener("pointerup", stopTravel, true);
  document.removeEventListener("pointercancel", stopTravel, true);
};

function watchTravel(x: number, y: number): void {
  if (typeof document === "undefined") return;
  stopTravel();
  travel = 0;
  travelFrom = { x, y };
  document.addEventListener("pointermove", onTravel, { capture: true, passive: true });
  document.addEventListener("pointerup", stopTravel, { capture: true, passive: true });
  document.addEventListener("pointercancel", stopTravel, { capture: true, passive: true });
}

export function scrollTapGuard(): {
  onPointerDownCapture: (e: React.PointerEvent) => void;
  onClickCapture: (e: React.MouseEvent) => void;
} {
  // Before the first press, not on it. Installed from the first pointerdown,
  // the tracker had recorded nothing by the time that press was judged, so
  // `sinceScrollMs` was Infinity and the settling rule could not fire for it
  // — the one press per page load where a thumb is most likely to be
  // arresting a fling. A scroller mounts this during render, which is early
  // enough to have watched everything that moved since.
  trackScrolls();
  return {
    onPointerDownCapture: (e) => {
      watchTravel(e.clientX, e.clientY);
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
      const release = {
        x: e.clientX,
        y: e.clientY,
        offsets: offsetsOf(p.scrollers),
        maxTravelPx: travel,
      };
      if (isDeliberateTap(p, release)) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}
