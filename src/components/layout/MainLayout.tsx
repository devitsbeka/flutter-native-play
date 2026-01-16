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
  showPlayButton?: boolean;
  showBottomNav?: boolean;
  className?: string;
}

export function MainLayout({
  children,
  onPlayClick,
  playsRemaining,
  maxPlays,
  canPlay,
  isVip,
  showPlayButton = true,
  showBottomNav = true,
  className = "",
}: MainLayoutProps) {
  return (
    <div className={`min-h-screen flex w-full ${className}`}>
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
      <main className="flex-1 h-screen overflow-y-auto relative pb-24 lg:pb-0 bg-background scroll-smooth scrollbar-hide">
        {children}
      </main>

      {/* Mobile Bottom Navigation - hidden on lg+ */}
      {showBottomNav && (
        <div className="lg:hidden">
          <UniversalBottomNav
            onPlayClick={onPlayClick}
            playsRemaining={playsRemaining}
            maxPlays={maxPlays}
            canPlay={canPlay}
            isVip={isVip}
          />
        </div>
      )}
    </div>
  );
}
