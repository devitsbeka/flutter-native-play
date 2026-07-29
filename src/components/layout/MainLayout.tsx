import { ReactNode } from "react";
import { UnifiedDesktopNav } from "./UnifiedDesktopNav";
import { UniversalBottomNav } from "./UniversalBottomNav";

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
  return (
    // 100dvh, not 100vh. On iOS, 100vh is the LARGE viewport - the height the
    // page would have if the browser chrome were hidden - so an h-screen
    // scroll container is taller than what is actually on screen. The document
    // then has somewhere to scroll, and scrolling it drags the whole shell up
    // behind the status bar and Dynamic Island: the cropped top on refresh.
    // dvh matches the visible area, so the document itself never scrolls and
    // the sticky header stays where it belongs.
    <div className={`min-h-[100dvh] flex w-full ${className}`}>
      {/* Desktop/Tablet Left Navigation */}
      <UnifiedDesktopNav
        onPlayClick={onPlayClick}
        playsRemaining={playsRemaining}
        maxPlays={maxPlays}
        canPlay={canPlay}
        isVip={isVip}
        showPlayButton={showPlayButton}
      />

      {/* Main Content Area */}
      <main 
        id="main-scroll-container"
        className={`flex-1 relative bg-transparent scrollbar-hide overflow-x-hidden ${
          disableScroll 
            ? 'h-[100dvh] overflow-hidden md:h-screen md:overflow-y-auto md:pb-0' 
            : 'h-[100dvh] md:h-screen overflow-y-auto pb-24 md:pb-0'
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
