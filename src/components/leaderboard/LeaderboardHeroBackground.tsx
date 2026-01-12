import { motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useEffect } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy positions on the original image (as % of full image width)
// Silver=left(~22%), Gold=center(~50%), Bronze=right(~78%)
// Offsets move the image: positive=shift right (show left side), negative=shift left (show right side)
const TROPHIES = [
  { tier: 2, imageX: 22, offset: 28, label: 'Silver' },   // Silver on LEFT, shift right to center it
  { tier: 3, imageX: 50, offset: 0, label: 'Gold' },      // Gold in CENTER, no offset needed
  { tier: 1, imageX: 78, offset: -28, label: 'Bronze' },  // Bronze on RIGHT, shift left to center it
];

// Get offset for a tier
const getOffsetForTier = (tier: number): number => {
  const trophy = TROPHIES.find(t => t.tier === tier);
  return trophy?.offset ?? 0;
};

// Find nearest tier based on current offset
const findNearestTier = (currentOffset: number, userTier: number): number => {
  const unlocked = TROPHIES.filter(t => t.tier <= userTier);
  let nearest = unlocked[0];
  let minDist = Math.abs(currentOffset - nearest.offset);
  
  for (const trophy of unlocked) {
    const dist = Math.abs(currentOffset - trophy.offset);
    if (dist < minDist) {
      minDist = dist;
      nearest = trophy;
    }
  }
  
  return nearest.tier;
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const targetOffset = getOffsetForTier(tier);
  
  // Motion value for drag - represents the offset as percentage
  const x = useMotionValue(targetOffset);
  
  // Spring animation for smooth snapping
  const springX = useSpring(x, {
    stiffness: 300,
    damping: 30,
  });

  // Sync with tier changes from outside (carousel swipe, etc.)
  useEffect(() => {
    x.set(targetOffset);
  }, [targetOffset, x]);

  // Handle drag end - snap to nearest tier
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    // Get current position and convert velocity to offset change
    const currentX = x.get();
    const velocityOffset = info.velocity.x * 0.05; // Factor for velocity influence
    const projectedOffset = currentX + velocityOffset;
    
    // Find and select nearest tier
    const nearestTier = findNearestTier(projectedOffset, userTier);
    onTierSelect?.(nearestTier);
  }, [x, userTier, onTierSelect]);

  // Handle drag - update motion value directly
  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Convert pixel drag to percentage offset
    // Dragging right (positive delta) should increase offset (move left on map)
    const dragFactor = 0.05; // Sensitivity
    const currentX = x.get();
    x.set(currentX + info.delta.x * dragFactor);
  }, [x]);

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Map container - static wrapper */}
      <div 
        className="absolute inset-0" 
        style={{ height: 'calc(100% + 100px)', top: '-100px' }}
      >
        {/* Draggable image - wider container (250%) for proper panning */}
        <motion.div
          className="absolute inset-0 w-[250%] h-full touch-none cursor-grab active:cursor-grabbing"
          style={{ marginLeft: '-75%' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{
            x: `${targetOffset}%`,
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
            className="w-full h-full object-cover object-bottom select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>
      </div>

      {/* Clickable Trophy Hotspots - for tap/click selection */}
      <div className="absolute inset-0 z-[4] pointer-events-none" style={{ height: 'calc(100% + 100px)', top: '-100px' }}>
        {TROPHIES.map((trophy) => {
          const isLocked = trophy.tier > userTier;
          
          // Calculate viewport position based on current tier's offset
          // With 250% width and -75% margin, viewport shows center 40% of image by default
          const imageCenter = 75 + targetOffset; // Where viewport center is on image (in %)
          const trophyRelativePos = trophy.imageX - imageCenter; // Position relative to viewport center
          const viewportX = 50 + (trophyRelativePos * 2.5); // Scale to viewport (250% = 2.5x)
          
          if (viewportX < -20 || viewportX > 120) return null;
          
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
                left: `${viewportX - 10}%`,
                top: '30%',
                width: '20%',
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
      
      {/* Content - pointer-events only on specific interactive elements */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
