import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
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
  className?: string;
}

export function PageHeader({
  title,
  onBack,
  showBack = true,
  rightElements,
  titleAccessory,
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
        createPortal(
          <div
            aria-hidden
            className="fixed top-0 left-0 right-0 z-30 bg-background pointer-events-none"
            style={{ height: "var(--safe-top)" }}
          />,
          document.body,
        )}

      <header
        className={`sticky top-0 z-20 bg-background backdrop-blur-md border-b border-border/30 ${className}`}
      >
        {/* 76px tall like the home header, so the search/bell icons land at
            the same vertical spot on every page */}
        <div className="flex items-center justify-between px-4 h-[76px] w-full">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 shadow-sm hover:bg-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="text-xl font-display font-bold text-slate-800 uppercase tracking-wide"
          >
            {title}
          </motion.h1>
          {titleAccessory}
        </div>

        {/* Right: search and bell by default, so every page carries the same
            pair in the same place as Explore. A page passes its own only when
            it has controls of its own to put there. */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          {rightElements ?? <HeaderActions />}
        </motion.div>
        </div>
      </header>
    </>
  );
}
