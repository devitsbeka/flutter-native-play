import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Back to the top of a long list, in one tap.
 *
 * Tapping the tab you are already on has scrolled to the top for a while
 * (see the nav buttons above), but nothing on screen says so — and on the
 * rooms list, which is the longest scroll in the app, the tab that would do
 * it is the one your thumb is furthest from. So the way back was to swipe up
 * twenty times.
 *
 * ## Finding the scroller
 *
 * There is no single scroll container to watch. Pages inside MainLayout
 * scroll in `#main-scroll-container`; the leaderboards have their own; and
 * every standalone page is a fixed-height box that scrolls itself, because
 * the document does not scroll at all on iOS (nativeShell disables the
 * webview's scroller — see CLAUDE.md). Hard-coding a list of ids would go
 * stale the next time a page is added.
 *
 * So this watches for scrolling instead of guessing where it happens. Scroll
 * events do not bubble, but they DO reach a capture-phase listener on the
 * document, whatever element they came from — so whichever box the finger is
 * actually moving is the one this remembers and the one the button returns
 * to the top.
 *
 * Horizontal rows (category carousels, the friends strip) fire the same
 * event and must not count as "the page is scrolled", so anything that
 * cannot scroll vertically is ignored.
 */

/** How far down before the button is worth the space it takes. */
const SHOW_AFTER_PX = 320;

/** Below this, an element is a horizontal rail, not the page's scroller. */
const MIN_SCROLLABLE_PX = 40;

const canScrollVertically = (el: HTMLElement) =>
  el.scrollHeight - el.clientHeight > MIN_SCROLLABLE_PX;

export function BackToTopButton() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const scrollerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target;

      // The document itself, on the web, where it is still allowed to scroll.
      if (target === document || target === document.documentElement || target === document.body) {
        scrollerRef.current = null;
        setVisible(window.scrollY > SHOW_AFTER_PX);
        return;
      }

      if (!(target instanceof HTMLElement) || !canScrollVertically(target)) return;
      scrollerRef.current = target;
      setVisible(target.scrollTop > SHOW_AFTER_PX);
    };

    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  // A new page starts at the top, and nothing scrolls to say so.
  useEffect(() => {
    scrollerRef.current = null;
    setVisible(false);
  }, [pathname]);

  const toTop = useCallback(() => {
    const el =
      scrollerRef.current ??
      document.getElementById("main-scroll-container") ??
      document.getElementById("leaderboard-scroll-container");
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    // Smooth scrolling reports its way down past the threshold on its own,
    // but hiding now is what makes the tap feel like it landed.
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={toTop}
          aria-label={t("common.backToTop")}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          // whileTap, not active:scale-95 — framer writes the transform
          // inline, and an inline transform beats the class.
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          // Centred on the play button and clear of the plays-remaining badge
          // above it: the centre button's 90px face already stands 22px proud
          // of the bar, and its badge another 8px above that.
          className="absolute left-1/2 -translate-x-1/2 z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white"
          style={{ bottom: "calc(100% + 36px)", boxShadow: "0 4px 14px rgba(0,0,0,0.16)" }}
        >
          <ChevronUp className="h-6 w-6 text-[#7126d5]" strokeWidth={3} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
