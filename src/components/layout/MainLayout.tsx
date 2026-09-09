import { ReactNode } from "react";
import { UnifiedDesktopNav } from "./UnifiedDesktopNav";
import { UniversalBottomNav } from "./UniversalBottomNav";
import { useInGameShell } from "./GameShellContext";
import { scrollTapGuard } from "@/utils/scrollTapGuard";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
  onPlayClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  isGuest?: boolean;
  vipExpiresAt?: string;
  showPlayButton?: boolean;
  showBottomNav?: boolean;
  className?: string;
  disableScroll?: boolean;
}

export function MainLayout({
  children,
  onPlayClick,
  playsRemaining,
  maxPlays,
  canPlay,
  isVip,
  isGuest = false,
  vipExpiresAt,
  showPlayButton = true,
  showBottomNav = true,
  className = "",
  disableScroll = false,
}: MainLayoutProps) {
  const embedded = useInGameShell();
  // Phones only: there, the headers carry no magnifying glass at all, so
  // this is the one instance on the page. From md up the header still has
  // its own search button, and a second instance answering the same
  // `?search=open` would open a second panel behind the first.
  const isPhone = useIsMobile();

  // Inside the GameShell the rail, header and world canvas are provided by
  // the shell itself — render only the page content in a local scroller.
  if (embedded) {
    return (
      <div className={`h-full w-full ${className}`}>
        {isPhone && <SpotlightSearch variant="headless" />}
        <main
          className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-transparent"
          {...scrollTapGuard()}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    // 100dvh MINUS the safe-area insets, not 100vh and not a bare 100dvh.
    //
    // 100vh is the LARGE viewport on iOS — the height the page would have if
    // the browser chrome were hidden — so an h-screen scroll container is
    // taller than what is on screen, the document gets somewhere to scroll,
    // and scrolling it drags the whole shell up behind the status bar and
    // Dynamic Island. That was the cropped top on refresh, and dvh fixed it.
    //
    // Then #root took a padding of --safe-top and --safe-bottom, and a child
    // of exactly 100dvh made the document taller than the viewport again by
    // precisely those two insets — the same drag, from the other end, on
    // every page in the app. The height has to be what is left after the
    // padding, which on the web (both insets 0) is still 100dvh.
    <div className={`min-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] flex w-full ${className}`}>
      {/* The search panel, with no trigger of its own. The magnifying glass
          is gone from the page headers — the balances have that corner now —
          and the side menu's Search row opens this through `?search=open`.
          It is mounted here rather than in the menu because the menu
          unmounts as it closes, taking any panel inside it along. */}
      {isPhone && <SpotlightSearch variant="headless" />}

      {/* Desktop/Tablet Left Navigation */}
      <UnifiedDesktopNav
        onPlayClick={onPlayClick}
        playsRemaining={playsRemaining}
        maxPlays={maxPlays}
        canPlay={canPlay}
        isVip={isVip}
        showPlayButton={showPlayButton}
      />

      {/* Main Content Area.
          The page scroller judges its own clicks (scrollTapGuard): a finger
          that lands to stop a fling, or slides while it is down, must not
          press the card it happens to be over. Every page of cards in the
          app scrolls in here. */}
      <main
        {...scrollTapGuard()}
        id="main-scroll-container"
        className={`flex-1 relative bg-transparent scrollbar-hide overflow-x-hidden ${
          disableScroll 
            ? 'h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden md:h-screen md:overflow-y-auto md:pb-0' 
            // pb-24 was 96px against a nav that is 80px plus the home
            // indicator's 34 — so the last ~18px of every page sat behind it,
            // and anything the page ended with (the streak panel on home) was
            // clipped. Computed from the same token the nav uses, plus the
            // inset it adds, plus a gap so content stops short of it rather
            // than touching.
            : 'h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] md:h-screen overflow-y-auto pb-[calc(var(--bottom-nav-height)_+_var(--safe-bottom)_+_1rem)] md:pb-0'
        }`}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on lg+ */}
      {showBottomNav && (
        <div className="md:hidden">
          <UniversalBottomNav
            onPlayClick={onPlayClick}
            playsRemaining={playsRemaining}
            maxPlays={maxPlays}
            canPlay={canPlay}
            isVip={isVip}
            isGuest={isGuest}
            vipExpiresAt={vipExpiresAt}
          />
        </div>
      )}
    </div>
  );
}
