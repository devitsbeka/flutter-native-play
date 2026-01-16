import { ReactNode, memo, useRef, useCallback } from "react";
import leaderboardBgBronze from "@/assets/leaderboard-bg-bronze.png";
import leaderboardBgSilver from "@/assets/leaderboard-bg-silver.png";
import leaderboardBgGold from "@/assets/leaderboard-bg-gold.png";

interface LeaderboardHeroBackgroundProps {
  children?: ReactNode;
  isMobile?: boolean;
  currentTier?: number;
  onTierChange?: (tier: number) => void;
}

// Map tier to background image
const TIER_BACKGROUNDS: Record<number, string> = {
  1: leaderboardBgBronze, // Bronze
  2: leaderboardBgSilver, // Silver
  3: leaderboardBgGold,   // Gold
};

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children,
  isMobile = false,
  currentTier = 2,
  onTierChange,
}: LeaderboardHeroBackgroundProps) {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const lastTierRef = useRef<number>(currentTier);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Calculate swipe direction based on touch movement
    const swipeDiff = touchStartX.current - touchEndX.current;
    
    const activeTier = lastTierRef.current;
    let newTier = activeTier;
    
    // Visual order: Silver(2) - Gold(3) - Bronze(1) from left to right
    // Swipe LEFT (swipeDiff > 0) = scroll right = show what's on the RIGHT
    // Swipe RIGHT (swipeDiff < 0) = scroll left = show what's on the LEFT
    
    if (swipeDiff > 30) {
      // Swipe left = move right visually: Silver→Gold→Bronze→Silver
      if (activeTier === 2) newTier = 3;      // Silver → Gold
      else if (activeTier === 3) newTier = 1; // Gold → Bronze
      else if (activeTier === 1) newTier = 2; // Bronze → Silver (wrap)
    } else if (swipeDiff < -30) {
      // Swipe right = move left visually: Bronze→Gold→Silver→Bronze
      if (activeTier === 1) newTier = 3;      // Bronze → Gold
      else if (activeTier === 3) newTier = 2; // Gold → Silver
      else if (activeTier === 2) newTier = 1; // Silver → Bronze (wrap)
    }
    
    lastTierRef.current = newTier;
    
    // Notify parent of tier change
    if (onTierChange && newTier !== activeTier) {
      onTierChange(newTier);
    }
  }, [onTierChange]);

  return (
    <div 
      className={`relative w-full overflow-hidden ${isMobile ? 'h-[50vh]' : 'min-h-screen'}`}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Background images */}
      {isMobile ? (
        // Mobile: Single background that switches based on current tier
        <div 
          className="absolute inset-0 w-full h-full bg-no-repeat transition-all duration-500 ease-out"
          style={{
            backgroundImage: `url(${TIER_BACKGROUNDS[currentTier] ?? leaderboardBgSilver})`,
            backgroundPosition: currentTier === 3 ? 'center calc(50% - 55px)' : 'center calc(50% - 105px)',
            backgroundSize: 'cover',
          }}
        />
      ) : (
        // Desktop: All 3 backgrounds side by side, each taking 1/3 width
        <div className="absolute inset-0 w-full h-full flex">
          <div 
            className="flex-1 h-full bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${leaderboardBgSilver})`,
              backgroundSize: 'auto 100%',
            }}
          />
          <div 
            className="flex-1 h-full bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${leaderboardBgGold})`,
              backgroundSize: 'auto 100%',
            }}
          />
          <div 
            className="flex-1 h-full bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${leaderboardBgBronze})`,
              backgroundSize: 'auto 100%',
            }}
          />
        </div>
      )}

      {/* Content container - account for left nav on desktop */}
      <div className={`relative z-20 ${isMobile ? 'w-full h-full' : 'max-w-[1200px] mx-auto lg:ml-[72px] xl:ml-[220px] lg:mr-auto'}`}>
        {children}
      </div>
    </div>
  );
});
