import { motion, PanInfo } from "framer-motion";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy X positions as percentage of image width (from left)
const TROPHIES = [
  { tier: 2, position: 22, label: 'Silver', labelKa: 'ვერცხლის' },
  { tier: 3, position: 50, label: 'Gold', labelKa: 'ოქროს' },
  { tier: 1, position: 78, label: 'Bronze', labelKa: 'ბრინჯაოს' },
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
  // For 250% width mobile: shift to center the trophy
  // Image is 250vw wide, positioned at -75vw left
  // Trophy at position% of image = position * 2.5vw from image left
  // We need to translate so that trophy is at 50vw (center of screen)
  return -(trophy.position - 50) * 2.5;
};

// Find nearest tier based on drag position
const findNearestTier = (currentTranslateVw: number): number => {
  let nearest = TROPHIES[0];
  let minDist = Math.abs(currentTranslateVw - getTranslateForTier(nearest.tier, false));
  
  for (const trophy of TROPHIES) {
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
  const { language } = useLanguage();
  const targetTranslate = getTranslateForTier(tier, isDesktop);

  // Handle drag end - snap to nearest tier (mobile only)
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (isDesktop) return; // No drag on desktop
    
    const vwPerPixel = 100 / window.innerWidth;
    const dragVw = info.offset.x * vwPerPixel;
    const velocityVw = info.velocity.x * vwPerPixel * 0.1;
    const finalPosition = targetTranslate + dragVw + velocityVw;
    
    const nearestTier = findNearestTier(finalPosition);
    onTierSelect?.(nearestTier);
  }, [isDesktop, targetTranslate, onTierSelect]);

  return (
    <motion.div
      className="relative overflow-hidden w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Map container - full width to prevent gaps */}
      <div 
        className="absolute inset-0 w-full" 
        style={{ height: 'calc(100% + 100px)', top: '-100px' }}
      >
        {/* 
          Responsive image:
          - Desktop (md+): 100% width, no panning, shows full image
          - Mobile: 250vw width (extra wide to prevent gaps), panning enabled between trophies
        */}
        <motion.div
          className={`absolute h-full ${isDesktop ? '' : 'touch-none cursor-grab active:cursor-grabbing'}`}
          style={{ 
            width: isDesktop ? '100%' : '250vw',
            left: isDesktop ? 0 : '-75vw',
          }}
          drag={isDesktop ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          onDragEnd={handleDragEnd}
          animate={{
            x: isDesktop ? 0 : `${targetTranslate}vw`,
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 28,
            mass: 1.2,
          }}
        >
          <img 
            src={gameMapBg} 
            alt="" 
            className="w-full h-full object-cover object-center select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {/* Floating Trophy Labels (desktop only) */}
        {isDesktop && (
          <>
            {TROPHIES.map((trophy, index) => {
              const label = language === 'ka' ? trophy.labelKa : trophy.label;
              const isActive = trophy.tier === tier;
              
              // Position adjustments per trophy (in % to scale with viewport)
              const offsetPercent = trophy.tier === 2 ? 2 : trophy.tier === 3 ? -2 : -6;
              
              return (
                <motion.button
                  key={trophy.tier}
                  onClick={() => onTierSelect?.(trophy.tier)}
                  className="absolute z-[6] cursor-pointer"
                  style={{
                    left: `${trophy.position + offsetPercent}%`,
                    top: '32%',
                    transform: 'translateX(-50%)',
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: isActive ? 1 : 0.6, 
                    y: [0, -6, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.3 },
                    y: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3,
                    }
                  }}
                  whileHover={{ scale: 1.05, opacity: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border border-border/50">
                    <span className="text-sm font-medium text-foreground/90 whitespace-nowrap">
                      {label}
                    </span>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-background/95 border-r border-b border-border/50 rotate-45" />
                </motion.button>
              );
            })}
          </>
        )}
      </div>

      {/* Clickable Trophy Hotspots (mobile only - on desktop all are visible) */}
      {!isDesktop && (
        <div className="absolute inset-0 z-[4] pointer-events-none" style={{ height: 'calc(100% + 100px)', top: '-100px' }}>
          {TROPHIES.map((trophy) => {
            const isLocked = trophy.tier > userTier;
            
            // Calculate where this trophy appears in viewport
            // Image is 250vw wide, trophy at position% of that = position * 2.5vw from image left
            const trophyInVw = (trophy.position / 100) * 250;
            // Image left edge is at -75vw + translation
            const imageLeftEdge = -75 + targetTranslate;
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
