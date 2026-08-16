import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Release a body scroll lock that outlived the thing that took it.
 *
 * Radix dialogs — and `react-remove-scroll` underneath them — lock scrolling
 * by writing `overflow: hidden`, `position`, `touch-action` and a
 * `data-scroll-locked` attribute onto <body>, and releasing them on close. If
 * a dialog unmounts while still open, which is what navigating away from a
 * page with an open modal does, the release never runs and the styles stay.
 * Every page after that is unscrollable, with nothing on screen to explain
 * why and no way back except relaunching.
 *
 * PowerUps already carried a hand-written version of this on one modal's
 * onClose, which fixes that one exit and no other.
 *
 * Runs on navigation and only when nothing is actually open, so a dialog that
 * legitimately holds the lock across a route change keeps it.
 */
export function useScrollLockGuard(): void {
  const location = useLocation();

  useEffect(() => {
    // Let the new route mount first: a modal opening as part of the
    // navigation would otherwise have its lock stripped immediately.
    const id = window.setTimeout(() => {
      const stillOpen = document.querySelector(
        '[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]',
      );
      if (stillOpen) return;

      const { body } = document;
      if (
        body.style.overflow ||
        body.style.position ||
        body.style.touchAction ||
        body.hasAttribute("data-scroll-locked")
      ) {
        body.style.overflow = "";
        body.style.position = "";
        body.style.touchAction = "";
        body.style.removeProperty("padding-right");
        body.removeAttribute("data-scroll-locked");
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [location.pathname]);
}
