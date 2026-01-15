import { ReactNode, memo, useState, useRef, useCallback } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
  isMobile?: boolean;
}

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children,
  isMobile = false,
}: LeaderboardHeroBackgroundProps) {
  // Background position as percentage (0 = left edge, 100 = right edge, 50 = center)
  const [bgPositionX, setBgPositionX] = useState(50);
  const touchStartX = useRef<number>(0);
  const startPositionX = useRef<number>(50);
  const isDragging = useRef<boolean>(false);

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
    // With 300% bg size, we want smooth panning
    const sensitivity = 0.15;
    
    // Calculate new position (inverted: drag left = show right side)
    let newPosition = startPositionX.current + (diff * sensitivity);
    
    // Clamp between 20% and 80% to keep content visible
    newPosition = Math.max(20, Math.min(80, newPosition));
    
    setBgPositionX(newPosition);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

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