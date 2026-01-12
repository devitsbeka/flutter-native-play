import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useEffect } from "react";
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

// Calculate translateX in vw to center a trophy
const getTranslateForTier = (tier: number): number => {
  const trophy = TROPHIES.find(t => t.tier === tier);
  if (!trophy) return 0;
  // Image is 200vw, so to center trophy.position%, shift by -(position - 50) * 2
  return -(trophy.position - 50) * 2;
};

// Find nearest tier based on current translateX (in vw)
const findNearestTier = (currentTranslateVw: number, userTier: number): number => {
  const unlocked = TROPHIES.filter(t => t.tier <= userTier);
  let nearest = unlocked[0];
  let minDist = Math.abs(currentTranslateVw - getTranslateForTier(nearest.tier));
  
  for (const trophy of unlocked) {
    const translate = getTranslateForTier(trophy.tier);
    const dist = Math.abs(currentTranslateVw - translate);
    if (dist < minDist) {
      minDist = dist;
      nearest = trophy;
    }
  }
  
  return nearest.tier;
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const targetTranslate = getTranslateForTier(tier);
  
  // Motion value for smooth dragging (no re-renders!)
  const dragX = useMotionValue(0);
  
  // Combine target position with drag offset
  const x = useTransform(dragX, (drag) => {
    const vwPerPixel = 100 / window.innerWidth;
    return targetTranslate + drag * vwPerPixel;
  });

  // Reset drag when tier changes
  useEffect(() => {
    dragX.set(0);
  }, [tier, dragX]);

  // Handle drag end - snap to nearest tier
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const vwPerPixel = 100 / window.innerWidth;
    const currentDragVw = dragX.get() * vwPerPixel;
    const velocityVw = info.velocity.x * vwPerPixel * 0.1;
    const finalPosition = targetTranslate + currentDragVw + velocityVw;
    
    const nearestTier = findNearestTier(finalPosition, userTier);
    dragX.set(0);
    onTierSelect?.(nearestTier);
  }, [targetTranslate, dragX, userTier, onTierSelect]);

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
        {/* Draggable image - 200vw wide, centered */}
        <motion.div
          className="absolute h-full touch-none cursor-grab active:cursor-grabbing"
          style={{ 
            width: '200vw',
            left: '-50vw',
            x: x.get() + 'vw',
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={{
            x: `${targetTranslate}vw`,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40,
          }}
          whileDrag={{ cursor: 'grabbing' }}
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
          const trophyInVw = (trophy.position / 100) * 200;
          const imageLeftEdge = -50 + targetTranslate;
          const trophyViewportPos = imageLeftEdge + trophyInVw;
          
          if (trophyViewportPos < -10 || trophyViewportPos > 110) return null;
          
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
                left: `${trophyViewportPos - 10}vw`,
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
      
      {/* Fade gradient at bottom */}
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
