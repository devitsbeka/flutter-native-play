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
      {/* Fixed max-width container to lock the layout - only on desktop */}
      <div className={`relative ${isMobile ? 'w-full' : 'max-w-[1400px] mx-auto'}`}>
        {/* Background image - responsive height based on viewport */}
        <div 
          className={`absolute inset-x-0 top-0 bg-no-repeat bg-top bg-[length:100%_auto] ${
            isMobile ? 'h-[70vh] md:h-[60vh]' : 'h-[600px]'
          }`}
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
        
        {/* Bottom gradient overlay for background image */}
        <div 
          className={`absolute inset-x-0 pointer-events-none z-10 ${
            isMobile ? 'top-[calc(70vh-100px)] md:top-[calc(60vh-100px)] h-[100px]' : 'top-[500px] h-[100px]'
          }`}
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
          }}
        />

        {/* Content */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
    </div>
  );
});
