import { ReactNode, memo, useState, useRef, useCallback, useEffect } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
  isMobile?: boolean;
  currentTier?: number;
  onTierChange?: (tier: number) => void;
}

// Map tier to background position (visual order: Silver-left, Gold-center, Bronze-right)
const TIER_POSITIONS: Record<number, number> = {
  1: 80, // Bronze - right side
  2: 20, // Silver - left side
  3: 50, // Gold - center
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
  const touchEndX = useRef<number>(0);
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
    touchEndX.current = e.touches[0].clientX;
    startPositionX.current = bgPositionX;
    isDragging.current = true;
  }, [bgPositionX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const currentX = e.touches[0].clientX;
    touchEndX.current = currentX;
    const diff = touchStartX.current - currentX;
    
    // Sensitivity: how much the bg moves per pixel dragged
    const sensitivity = 0.15;
    
    // Calculate new position - no clamping for free movement
    let newPosition = startPositionX.current + (diff * sensitivity);
    
    // Allow wider range for smoother dragging
    newPosition = Math.max(0, Math.min(100, newPosition));
    
    setBgPositionX(newPosition);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    
    // Calculate swipe direction based on touch movement
    const swipeDiff = touchStartX.current - touchEndX.current;
    
    // Use the prop currentTier to get the actual current tier
    const activeTier = lastTierRef.current;
    let newTier = activeTier;
    
    // Any swipe in a direction changes tier (very low threshold)
    if (swipeDiff > 5) {
      // Swipe left: Silver→Bronze, Gold→Silver, Bronze→Gold
      if (activeTier === 2) newTier = 1;
      else if (activeTier === 3) newTier = 2;
      else if (activeTier === 1) newTier = 3;
    } else if (swipeDiff < -5) {
      // Swipe right: Silver→Gold, Gold→Bronze, Bronze→Silver
      if (activeTier === 2) newTier = 3;
      else if (activeTier === 3) newTier = 1;
      else if (activeTier === 1) newTier = 2;
    }
    
    // Snap to tier position
    setBgPositionX(TIER_POSITIONS[newTier]);
    lastTierRef.current = newTier;
    
    // Notify parent of tier change
    if (onTierChange && newTier !== activeTier) {
      onTierChange(newTier);
    }
  }, [onTierChange]);

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
          transition: isDragging.current ? 'none' : 'background-position 0.3s ease-out',
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
