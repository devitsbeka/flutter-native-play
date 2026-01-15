import { ReactNode, memo, useState, useRef, useCallback } from "react";
import leaderboardMapDesktop from "@/assets/leaderboard-map-desktop.png";

interface LeaderboardHeroBackgroundProps {
  children: ReactNode;
  isMobile?: boolean;
}

// Background positions: left (gold), center (silver), right (bronze)
const POSITIONS = ['left', 'center', 'right'] as const;
type Position = typeof POSITIONS[number];

const getBackgroundPosition = (position: Position, isMobile: boolean): string => {
  if (!isMobile) return 'top';
  switch (position) {
    case 'left': return '80% top';   // Gold trophy on the left side
    case 'center': return '50% top'; // Silver trophy in center
    case 'right': return '20% top';  // Bronze trophy on the right side
    default: return '50% top';
  }
};

export const LeaderboardHeroBackground = memo(function LeaderboardHeroBackground({ 
  children,
  isMobile = false,
}: LeaderboardHeroBackgroundProps) {
  const [currentPosition, setCurrentPosition] = useState<Position>('center');
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) < threshold) return;

    const currentIndex = POSITIONS.indexOf(currentPosition);
    
    if (diff > 0) {
      // Swiped left - move to right position (bronze)
      const newIndex = Math.min(currentIndex + 1, POSITIONS.length - 1);
      setCurrentPosition(POSITIONS[newIndex]);
    } else {
      // Swiped right - move to left position (gold)
      const newIndex = Math.max(currentIndex - 1, 0);
      setCurrentPosition(POSITIONS[newIndex]);
    }
  }, [currentPosition]);

  return (
    <div 
      className="relative w-full overflow-hidden min-h-screen"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Background image - extends full height behind content */}
      <div 
        className="absolute inset-0 w-full bg-no-repeat bg-[length:300%_auto] md:bg-[length:100%_auto] transition-all duration-500 ease-out"
        style={{
          backgroundImage: `url(${leaderboardMapDesktop})`,
          backgroundPosition: getBackgroundPosition(currentPosition, isMobile),
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