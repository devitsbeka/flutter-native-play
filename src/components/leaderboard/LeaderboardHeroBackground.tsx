import { ReactNode, memo, useState, useRef, useCallback, useEffect } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
  isMobile?: boolean;
  currentTier?: number;
  onTierChange?: (tier: number) => void;
}

// Map tier to background position (1=bronze=right, 2=silver=center, 3=gold=left)
const TIER_POSITIONS: Record<number, number> = {
  1: 80, // Bronze - right side
  2: 50, // Silver - center
  3: 20, // Gold - left side
};

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children,
  isMobile = false,
  currentTier = 2,
  onTierChange,
}: LeaderboardHeroBackgroundProps) {
  // Background position as percentage (0 = left edge, 100 = right edge, 50 = center)
  const [bgPositionX, setBgPositionX] = useState(() => TIER_POSITIONS[currentTier] ?? 50);
  const touchStartX = useRef<number>(0);
  const startPositionX = useRef<number>(50);
  const isDragging = useRef<boolean>(false);
  const lastTierRef = useRef<number>(currentTier);

  // Sync position when tier changes externally (from carousel)
  useEffect(() => {
    if (currentTier !== lastTierRef.current) {
      lastTierRef.current = currentTier;
      setBgPositionX(TIER_POSITIONS[currentTier] ?? 50);
    }
  }, [currentTier]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    startPositionX.current = bgPositionX;
    isDragging.current = true;
  }, [bgPositionX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    
    // Sensitivity: how much the bg moves per pixel dragged
    const sensitivity = 0.15;
    
    // Calculate new position (inverted: drag left = show right side)
    let newPosition = startPositionX.current + (diff * sensitivity);
    
    // Clamp between 20% and 80% to keep content visible
    newPosition = Math.max(20, Math.min(80, newPosition));
    
    setBgPositionX(newPosition);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    
    // Determine which tier based on final position
    // Position thresholds: <35 = Gold(3), 35-65 = Silver(2), >65 = Bronze(1)
    let newTier: number;
    if (bgPositionX < 35) {
      newTier = 3; // Gold
    } else if (bgPositionX > 65) {
      newTier = 1; // Bronze
    } else {
      newTier = 2; // Silver
    }
    
    // Snap to tier position
    setBgPositionX(TIER_POSITIONS[newTier]);
    
    // Notify parent of tier change
    if (onTierChange && newTier !== lastTierRef.current) {
      lastTierRef.current = newTier;
      onTierChange(newTier);
    }
  }, [bgPositionX, onTierChange]);

  return (
    <div 
      className="relative w-full overflow-hidden min-h-screen touch-pan-y"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Background image - extends full height behind content */}
      <div 
        className="absolute inset-0 w-full bg-no-repeat bg-[length:300%_auto] md:bg-[length:100%_auto]"
        style={{
          backgroundImage: `url(${leaderboardMapDesktop})`,
          backgroundPosition: isMobile ? `${bgPositionX}% top` : 'center top',
          transition: isDragging.current ? 'none' : 'background-position 0.1s ease-out',
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