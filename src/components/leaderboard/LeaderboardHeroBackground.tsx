import { ReactNode, memo } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
}

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children, 
}: LeaderboardHeroBackgroundProps) {
  return (
    <div className="relative w-full overflow-hidden min-h-screen">
      {/* Fixed max-width container to lock the layout */}
      <div className="max-w-[1400px] mx-auto relative">
        {/* Background image - same for all breakpoints, fixed height */}
        <div 
          className="absolute inset-x-0 top-0 h-[600px] bg-no-repeat bg-top bg-[length:100%_auto]"
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
          className="absolute inset-x-0 top-[500px] h-[100px] pointer-events-none z-10"
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
