import { useEffect, useRef } from "react";

import { markProgrammaticScroll } from "@/utils/scrollTapGuard";

/**
 * Where a page's scroller was when the player last left it.
 *
 * The home is a long feed — rooms, the play modes, categories, trivias, the
 * store rails — and tapping anything in it navigates away, which unmounts
 * the page. Coming back mounted a fresh one at the top, so a player who
 * scrolled to the Play rail, opened a game and pressed Back landed at the
 * top of the home and had to scroll down to find where they had been
 * (owner: "I should see the scrolled page and the exact area where I was").
 *
 * Kept in memory rather than storage: it is a fact about this visit, and it
 * should not survive a relaunch — opening the app tomorrow starts at the
 * top, which is right.
 *
 * ## The position is recorded while scrolling, not on the way out
 *
 * The obvious place to read it is the effect's cleanup, and that place is
 * wrong: by the time cleanup runs React has already detached the node, and
 * a detached element reports `scrollTop` 0. Every visit stored a 0 and
 * nothing was ever restored. So each scroll records where the player is,
 * and leaving simply stops.
 *
 * ## Why restoring takes more than one frame
 *
 * The feed's rails arrive from the network over the second or so after
 * mount, so the page is short when it first paints and grows as they land.
 * Setting `scrollTop` to a remembered 2000px against a 900px-tall page
 * silently clamps to the bottom of what exists — and then the rest arrives
 * underneath, leaving the player somewhere they never were. So the position
 * is re-applied each frame until the page is tall enough to hold it, and
 * given up on after a moment in case the content never comes back (a rail
 * that is empty this time, a failed fetch).
 *
 * While that is running the scroll events it causes are ignored, or the
 * clamped position would overwrite the very target being restored.
 *
 * The player wins immediately: a press, a touch, a wheel or a key stops the
 * restoring, so this can never drag the page out from under someone who has
 * already started reading — and, just as importantly, the offsets cannot
 * change between a press and its click, which is the other way a moving
 * scroller makes a tap disappear.
 */

/** Remembered offsets by key, for this run of the app only. */
const positions = new Map<string, number>();

/** How long to keep waiting for late content before giving up. */
const RESTORE_WINDOW_MS = 2500;

export function useScrollMemory<T extends HTMLElement>(key: string) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const target = positions.get(key) ?? 0;
    let frame = 0;
    let restoring = target > 0;

    const stop = () => {
      restoring = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    // Where the player is, remembered as they go. Ignored while restoring:
    // those events are this hook's own writes, and the clamped value they
    // carry would erase the target.
    const record = () => {
      if (!restoring) positions.set(key, el.scrollTop);
    };

    if (restoring) {
      const deadline = performance.now() + RESTORE_WINDOW_MS;
      const apply = () => {
        if (!restoring || !ref.current) return;
        const node = ref.current;
        const max = node.scrollHeight - node.clientHeight;
        // Say so before moving it. The page scroller's tap guard treats a
        // moving scroller as one the finger is holding, and swallowed every
        // tap for as long as this ran — a dead home feed for the second or
        // so after coming back to it.
        markProgrammaticScroll(node);
        node.scrollTop = Math.min(target, max);
        // Done as soon as the page can hold the whole offset; otherwise
        // keep re-applying while the rails land.
        if (max >= target || performance.now() > deadline) {
          // One frame's grace so the scroll events from the assignment
          // above land while `restoring` is still true.
          frame = requestAnimationFrame(stop);
          return;
        }
        frame = requestAnimationFrame(apply);
      };
      frame = requestAnimationFrame(apply);
    }

    // Anything the player does outranks the restore.
    el.addEventListener("pointerdown", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("keydown", stop);
    el.addEventListener("scroll", record, { passive: true });

    return () => {
      stop();
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("keydown", stop);
      el.removeEventListener("scroll", record);
    };
  }, [key]);

  return ref;
}

/** Testing seam: forget everything remembered so far. */
export function clearScrollMemory() {
  positions.clear();
}
