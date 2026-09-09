import { ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { HeaderActions } from "@/components/shared/HeaderActions";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  /** On by default, because most pages are sub-pages. The bottom nav only
      reaches five destinations — home, explore, shop, rating and online
      game — and those pass `false`: an arrow back to wherever you happened
      to come from is a second, inconsistent way to move between screens the
      nav already switches. Everywhere else it is the only way out. */
  showBack?: boolean;
  /** Defaults to the search and bell every top-level page carries. Pass
      something else only when the page has controls of its own. */
  rightElements?: React.ReactNode;
  /** Sits immediately after the title, inside the left group. The shop puts
      its coin and gem pills here on tablet and desktop, where the row is
      already on screen and half empty. */
  titleAccessory?: React.ReactNode;
  /** A second row inside the header, under the 76px title row — the balance
      strip, on the main screens that carry one (BalanceStripRow). Inside the
      <header> rather than after it so it shares the header's surface and its
      sticky/overlay behaviour instead of needing its own of each. */
  belowRow?: React.ReactNode;
  /** Draws the header on artwork rather than on the page wash: no surface,
      no rule under it, and a white title with a shadow so it stays legible
      over whatever is moving behind it. Explore uses it over its video. */
  overlay?: boolean;
  /** Overlay headers only. The page has scrolled far enough that there is no
      longer artwork behind the header — its own content is passing under it —
      so the header takes a surface of its own: white, with the title and the
      icons in the accent the tab strip already uses. Explore turns this on
      when its sheet reaches the top. */
  docked?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  onBack,
  showBack = true,
  rightElements,
  titleAccessory,
  belowRow,
  overlay = false,
  docked = false,
  className = "",
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    // location.key is "default" when this page is the first in-app history
    // entry — e.g. after an external redirect back from Stripe checkout.
    // navigate(-1) would return to the external page (which bounces the user
    // right back here in a loop), so go home instead. window.history.length
    // can't detect this: it counts the external pages too.
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <>
      {/* The status bar strip, painted in the header's own colour.
       *
       * This was a negative margin on the header — pull up by the inset,
       * re-add it as padding — and it could never have worked from here.
       * Every page using this header renders inside MainLayout's
       * `overflow-y-auto` scroll container, and a negative margin-top inside
       * a scroller does not escape it: the pulled-up strip is clipped away
       * and the scroll origin will not go above zero. What survived was the
       * padding, so the header grew by a whole safe-area inset and the strip
       * above it kept showing the page wash.
       *
       * That is one bug wearing two faces — the "huge space at the top" and
       * the "status bar is the wrong colour" are the same margin failing —
       * which is why fixing either half by itself never held.
       *
       * A portal to <body>, because `fixed` alone is not enough either: any
       * transformed ancestor (framer-motion writes transforms constantly)
       * becomes the containing block and the strip lands somewhere else on
       * exactly the pages that animate.
       *
       * Opaque and `bg-background`, the same token the header row uses, so
       * the two are one surface and both follow the theme.
       */}
      {typeof document !== "undefined" &&
        (!overlay || docked) &&
        createPortal(
          <div
            aria-hidden
            className={`fixed top-0 left-0 right-0 z-30 pointer-events-none ${
              overlay ? "bg-white" : "bg-background"
            }`}
            style={{ height: "var(--safe-top)" }}
          />,
          document.body,
        )}

      {/* The surface belongs to the title row, not to the <header>.
       *
       * The header is also the frame for `belowRow` — the balance strip —
       * and that strip is deliberately translucent: 80% fill over a blur, so
       * the page shows through it as frost. A background on the <header>
       * itself sits directly behind the strip, which is then blurring an
       * opaque wash and frosting nothing. Paint the row, leave the rest of
       * the header clear, and the strip has real page content behind it on
       * every screen that carries one. */}
      <header
        className={
          overlay
            ? `relative z-20 ${className}`
            : `sticky top-0 z-20 border-b border-border/30 ${className}`
        }
      >
        {/* 76px tall and 16px in from both edges on every page, overlay or
            not, so the title and the search/bell pair land on exactly the
            same pixels wherever you are.

            The overlay variant used to inset by 26 (Explore's own figure,
            from a frame where there is no surface edge to line up with).
            That is a 10px sideways jump of the title and of both icons every
            time you cross between Explore and any other tab, and a header
            that moves when the page changes reads as the app slipping rather
            than as two designs. One number, everywhere. */}
        <div
          className={`flex items-center justify-between h-[76px] w-full px-4 transition-colors duration-200 ${
            overlay
              ? docked
                ? "bg-white md:bg-white/95 md:backdrop-blur-md md:[-webkit-backdrop-filter:blur(12px)]"
                : "bg-transparent"
              : "bg-background"
          }`}
        >
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 shadow-sm hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1
            className={`text-xl font-display font-bold uppercase tracking-wide transition-colors duration-200 ${
              overlay
                ? docked
                  ? "text-[#6D28D9]"
                  : "text-white [text-shadow:0_2px_8px_rgba(23,10,54,0.45)]"
                : "text-slate-800"
            }`}
          >
            {title}
          </h1>
          {titleAccessory}
        </div>

        {/* Right: search and bell by default, so every page carries the same
            pair in the same place as Explore. A page passes its own only when
            it has controls of its own to put there. */}
        <div className="flex items-center gap-2">
          {rightElements ?? <HeaderActions />}
        </div>
        </div>

        {belowRow}
      </header>
    </>
  );
}
