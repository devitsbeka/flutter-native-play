import { motion, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useState } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy X positions as percentage of image width (from left)
// Silver ~22%, Gold ~50%, Bronze ~78%
const TROPHIES = [
  { tier: 2, position: 22, label: 'Silver' },
  { tier: 3, position: 50, label: 'Gold' },
  { tier: 1, position: 78, label: 'Bronze' },
];

// Calculate translateX to center a trophy position in viewport
// When image is 200vw wide, we need to shift by (position - 50) * 2
const getTranslateForTier = (tier: number): number => {
  const trophy = TROPHIES.find(t => t.tier === tier);
  if (!trophy) return 0;
  // Shift so trophy.position becomes centered (at 50%)
  // For 200vw width: translateX = -(position - 50) * 2vw
  return -(trophy.position - 50) * 2;
};

// Find nearest tier based on current translateX
const findNearestTier = (currentTranslate: number, userTier: number): number => {
  const unlocked = TROPHIES.filter(t => t.tier <= userTier);
  let nearest = unlocked[0];
  let minDist = Math.abs(currentTranslate - getTranslateForTier(nearest.tier));
  
  for (const trophy of unlocked) {
    const translate = getTranslateForTier(trophy.tier);
    const dist = Math.abs(currentTranslate - translate);
    if (dist < minDist) {
      minDist = dist;
      nearest = trophy;
    }
  }
  
  return nearest.tier;
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const targetTranslate = getTranslateForTier(tier);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle drag - accumulate offset during drag
  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Convert pixel drag to vw offset (screen width = 100vw)
    const vwPerPixel = 100 / window.innerWidth;
    setDragOffset(prev => prev + info.delta.x * vwPerPixel);
  }, []);

  // Handle drag end - snap to nearest tier
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const vwPerPixel = 100 / window.innerWidth;
    const velocityOffset = info.velocity.x * vwPerPixel * 0.1;
    const finalOffset = targetTranslate + dragOffset + velocityOffset;
    
    const nearestTier = findNearestTier(finalOffset, userTier);
    setDragOffset(0);
    onTierSelect?.(nearestTier);
  }, [targetTranslate, dragOffset, userTier, onTierSelect]);

  // Reset drag offset when tier changes externally
  const currentTranslate = targetTranslate + dragOffset;

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Map container */}
      <div 
        className="absolute inset-0" 
        style={{ height: 'calc(100% + 100px)', top: '-100px' }}
      >
        {/* 
          Image sizing:
          - Mobile: 200vw wide (can pan between all 3 trophies)
          - Tablet: 150vw wide (moderate panning)
          - Desktop: 110vw wide (slight panning, almost full view)
        */}
        <motion.div
          className="absolute h-full touch-none cursor-grab active:cursor-grabbing"
          style={{ 
            width: '200vw',
            left: '-50vw', // Center the 200vw image (offset by half the extra width)
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{
            x: `${currentTranslate}vw`,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <img 
            src={gameMapBg} 
            alt="" 
            className="w-full h-full object-cover object-center select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>
      </div>

      {/* Clickable Trophy Hotspots */}
      <div className="absolute inset-0 z-[4] pointer-events-none" style={{ height: 'calc(100% + 100px)', top: '-100px' }}>
        {TROPHIES.map((trophy) => {
          const isLocked = trophy.tier > userTier;
          
          // Calculate where this trophy appears in viewport
          // Trophy is at trophy.position% of image, image is translated by currentTranslate vw
          // Viewport center is at 50vw, image center (50% of 200vw = 100vw) is at 50vw + currentTranslate
          const trophyInVw = (trophy.position / 100) * 200; // Trophy position in vw (0-200)
          const imageLeftEdge = -50 + currentTranslate; // Where left edge of image is in vw
          const trophyViewportPos = imageLeftEdge + trophyInVw; // Trophy position in viewport vw
          const trophyViewportPercent = trophyViewportPos; // Already in vw which is effectively %
          
          if (trophyViewportPercent < -10 || trophyViewportPercent > 110) return null;
          
          return (
            <motion.button
              key={trophy.tier}
              onClick={() => !isLocked && onTierSelect?.(trophy.tier)}
              disabled={isLocked}
              className={`absolute rounded-xl pointer-events-auto ${
                isLocked 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer'
              }`}
              style={{
                left: `${trophyViewportPercent - 10}vw`,
                top: '30%',
                width: '20vw',
                height: '45%',
              }}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              aria-label={`Select ${trophy.label} league`}
            />
          );
        })}
      </div>
      
      {/* Fade to background gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent z-[5] pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
