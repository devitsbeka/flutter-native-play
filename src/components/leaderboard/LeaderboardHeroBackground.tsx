import { motion, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useEffect, useState } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy X positions as percentage of image width (from left)
const TROPHIES = [
  { tier: 2, position: 22, label: 'Silver' },
  { tier: 3, position: 50, label: 'Gold' },
  { tier: 1, position: 78, label: 'Bronze' },
];

// Check if we're on desktop (wide screen where full image fits)
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  return isDesktop;
};

// Calculate translateX to center a trophy (only for mobile)
const getTranslateForTier = (tier: number, isDesktop: boolean): number => {
  if (isDesktop) return 0; // No translation on desktop - show full image
  
  const trophy = TROPHIES.find(t => t.tier === tier);
  if (!trophy) return 0;
  // For 200% width mobile: shift to center the trophy
  return -(trophy.position - 50) * 2;
};

// Find nearest tier based on drag position
const findNearestTier = (currentTranslateVw: number, userTier: number): number => {
  const unlocked = TROPHIES.filter(t => t.tier <= userTier);
  let nearest = unlocked[0];
  let minDist = Math.abs(currentTranslateVw - getTranslateForTier(nearest.tier, false));
  
  for (const trophy of unlocked) {
    const translate = getTranslateForTier(trophy.tier, false);
    const dist = Math.abs(currentTranslateVw - translate);
    if (dist < minDist) {
      minDist = dist;
      nearest = trophy;
    }
  }
  
  return nearest.tier;
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const isDesktop = useIsDesktop();
  const targetTranslate = getTranslateForTier(tier, isDesktop);

  // Handle drag end - snap to nearest tier (mobile only)
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (isDesktop) return; // No drag on desktop
    
    const vwPerPixel = 100 / window.innerWidth;
    const dragVw = info.offset.x * vwPerPixel;
    const velocityVw = info.velocity.x * vwPerPixel * 0.1;
    const finalPosition = targetTranslate + dragVw + velocityVw;
    
    const nearestTier = findNearestTier(finalPosition, userTier);
    onTierSelect?.(nearestTier);
  }, [isDesktop, targetTranslate, userTier, onTierSelect]);

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
          Responsive image:
          - Desktop (md+): 100% width, no panning, shows full image
          - Mobile: 200vw width, panning enabled between trophies
        */}
        <motion.div
          className={`absolute h-full ${isDesktop ? '' : 'touch-none cursor-grab active:cursor-grabbing'}`}
          style={{ 
            width: isDesktop ? '100%' : '200vw',
            left: isDesktop ? 0 : '-50vw',
          }}
          drag={isDesktop ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          animate={{
            x: isDesktop ? 0 : `${targetTranslate}vw`,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40,
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

      {/* Clickable Trophy Hotspots (mobile only - on desktop all are visible) */}
      {!isDesktop && (
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
      )}
      
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
