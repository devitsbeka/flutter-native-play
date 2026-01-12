import { motion } from "framer-motion";
import { ReactNode, useMemo } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy positions on the original image (as % of full image width/height)
const TROPHY_IMAGE_POSITIONS = [
  { tier: 2, x: 25, label: 'Silver' },   // Silver at 25% of image
  { tier: 3, x: 50, label: 'Gold' },     // Gold at 50% of image (center)
  { tier: 1, x: 73, label: 'Bronze' },   // Bronze at 73% of image
];

// Map pan positions to center each trophy in the viewport
// Image is 160% width, viewport sees ~62.5% of image
// When centered (offset 0), viewport shows 18.75% to 81.25% of image
const MAP_POSITIONS: Record<number, number> = {
  1: -14.5,  // Bronze at 73% -> pan left
  2: 15.5,   // Silver at 25% -> pan right
  3: 0,      // Gold at 50% -> centered
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const mapOffset = MAP_POSITIONS[tier] || 0;

  // Calculate where each trophy appears in the viewport based on current pan offset
  // The image is 160% wide, offset as % of that width
  // We need to translate image coordinates to viewport coordinates
  const hotspotsInViewport = useMemo(() => {
    return TROPHY_IMAGE_POSITIONS.map((trophy) => {
      // Image is 160% wide with -30% margin, offset applied on top
      // Trophy X in image space: trophy.x% of 160% width
      // With offset: trophy position shifts by offset% of 160% width
      // Viewport sees from (30% - offset*1.6) to (30% + 62.5% - offset*1.6) of image
      
      // Convert image X to viewport X:
      // viewportX = (imageX - viewportStart) / viewportWidth * 100%
      // viewportStart = 30% - offset*1.6
      // viewportWidth = 62.5% (100/160)
      
      const viewportStart = 30 - mapOffset * 1.6;
      const viewportWidth = 62.5;
      const viewportX = ((trophy.x - viewportStart) / viewportWidth) * 100;
      
      return {
        ...trophy,
        viewportX,
      };
    });
  }, [mapOffset]);

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '62vh' }}
    >
      {/* Pannable Map Background - moved up to show more trophies */}
      <div className="absolute inset-0" style={{ height: 'calc(100% + 100px)', top: '-100px' }}>
        <motion.div
          className="absolute inset-0 w-[160%] h-full"
          style={{ marginLeft: '-30%' }}
          animate={{
            x: `${mapOffset}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 60,
            damping: 20,
          }}
        >
          <img 
            src={gameMapBg} 
            alt="" 
            className="w-full h-full object-cover object-bottom"
          />
        </motion.div>
      </div>

      {/* Clickable Trophy Hotspots - positioned in viewport space, NOT moving with map */}
      <div className="absolute inset-0 z-[4]" style={{ height: 'calc(100% + 100px)', top: '-100px' }}>
        {hotspotsInViewport.map((hotspot) => {
          const isLocked = hotspot.tier > userTier;
          const isActive = hotspot.tier === tier;
          
          // Only show hotspots that are within viewport (0-100%)
          if (hotspot.viewportX < -20 || hotspot.viewportX > 120) return null;
          
          return (
            <motion.button
              key={hotspot.tier}
              onClick={() => !isLocked && onTierSelect?.(hotspot.tier)}
              disabled={isLocked}
              className={`absolute rounded-xl ${
                isLocked 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer'
              }`}
              style={{
                left: `${hotspot.viewportX - 10}%`,
                top: '30%',
                width: '20%',
                height: '45%',
              }}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              animate={{
                backgroundColor: isActive 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'rgba(255,255,255,0)',
              }}
              transition={{ duration: 0.2 }}
              aria-label={`Select ${hotspot.label} league`}
            />
          );
        })}
      </div>
      
      {/* Fade to white gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/70 to-transparent z-[5]" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </motion.div>
  );
}
