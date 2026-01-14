import { ReactNode, memo } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
  isMobile?: boolean;
}

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children,
  isMobile = false,
}: LeaderboardHeroBackgroundProps) {
  return (
    <div className="relative w-full overflow-hidden min-h-screen">
      {/* Background image - extends full height behind content */}
      <div 
        className="absolute inset-0 w-full bg-no-repeat bg-top bg-[length:100%_auto]"
        style={{
          backgroundImage: `url(${leaderboardMapDesktop})`,
        }}
      />
      
      {/* Top gradient overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-12 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)'
        }}
      />

      {/* Content container - max-width only on desktop */}
      <div className={`relative z-20 ${isMobile ? 'w-full' : 'max-w-[1400px] mx-auto'}`}>
        {children}
      </div>
    </div>
  );
});
