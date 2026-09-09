import { useState } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { BalancePills } from "@/components/shared/BalanceStrip";
import { SideMenuDrawer } from "@/components/home/SideMenuDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { t } from "@/lib/i18n";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  /** On by default, because most pages are sub-pages. The bottom nav only
      reaches five destinations — home, explore, shop, rating and online
      game — and those pass `false`: an arrow back to wherever you happened
      to come from is a second, inconsistent way to move between screens the
      nav already switches. Everywhere else it is the only way out. */
  showBack?: boolean;
  /** Tablet and desktop only. On the phone the right of the row is the coin
      and gem balances on every page, so that whatever the screen, they are
      in the same corner — see the header row below. Defaults to the search
      and bell; pass something else only when the page has controls of its
      own. */
  rightElements?: React.ReactNode;
  /** Sits immediately after the title, inside the left group. The shop puts
      its coin and gem pills here on tablet and desktop, where the row is
      already on screen and half empty. */
  titleAccessory?: React.ReactNode;
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
  overlay = false,
  docked = false,
  className = "",
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { coins, gems } = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);

  // The phone's header row: burger on the left, balances on the right, on
  // every top-level screen. A page with a back arrow is a sub-screen — it
  // keeps the arrow, and the balances stay off it.
  //
  // The burger is the way to search and to notifications now; both used to
  // be glyphs on the right of this row, which is where the balances went.
  const topLevel = !showBack;
  const showBalances = topLevel && !!user;

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

      <header
        className={
          overlay
            ? `relative z-20 transition-colors duration-200 ${
                docked
                  ? "bg-white md:bg-white/95 md:backdrop-blur-md md:[-webkit-backdrop-filter:blur(12px)]"
                  : "bg-transparent"
              } ${className}`
            : `sticky top-0 z-20 bg-background md:backdrop-blur-md border-b border-border/30 ${className}`
        }
      >
        {/* 76px tall like the home header, so the search/bell icons land at
            the same vertical spot on every page.

            26px of side padding in the overlay variant, 16 everywhere else:
            on artwork there is no surface edge to line the title up with, and
            Explore's design sets the title and the icons in from the screen
            by 26. On a page wash the header lines up with the content below
            it instead, which is padded by 16. */}
        <div
          className={`flex items-center justify-between h-[76px] w-full ${
            overlay ? "px-[26px]" : "px-4"
          }`}
        >
        {/* Left: Back button (sub-screens) or burger (top-level), + title */}
        <div className="flex min-w-0 items-center gap-3">
          {topLevel && (
            <motion.button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("menu.menuTitle")}
              whileTap={{ scale: 0.9 }}
              className="md:hidden -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/30"
            >
              <Menu className={`h-6 w-6 ${overlay && !docked ? "text-white" : "text-gray-600"}`} />
            </motion.button>
          )}
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
            className={`min-w-0 truncate text-xl font-display font-bold uppercase tracking-wide transition-colors duration-200 ${
              overlay
                ? docked
                  ? "text-[#6D28D9]"
                  : "text-white [text-shadow:0_2px_8px_rgba(23,10,54,0.45)]"
                : "text-slate-800"
            }`}
          >
            {title}
          </motion.h1>
          {titleAccessory}
        </div>

        {/* Right: the balances on the phone, so a player can see what they
            have from any screen without going home for it; search and bell
            (or whatever the page passes) from md up, where the row is wide
            enough for both and the burger that holds them does not exist. */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex shrink-0 items-center gap-2"
        >
          {showBalances && (
            <div className="flex items-center gap-[8px] md:hidden">
              <BalancePills
                size="compact"
                coins={coins}
                gems={gems}
                onCoinsClick={() => navigate("/power-ups?section=coins")}
                onGemsClick={() => navigate("/power-ups?section=gems-lari")}
              />
            </div>
          )}
          <span className={showBalances ? "hidden md:flex md:items-center md:gap-2" : "flex items-center gap-2"}>
            {rightElements ?? <HeaderActions />}
          </span>
        </motion.div>
        </div>
      </header>

      {topLevel && <SideMenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
