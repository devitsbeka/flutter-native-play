import { motion } from "framer-motion";
import { ReactNode } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
  onTierSelect?: (tier: number) => void;
  userTier?: number;
}

// Trophy hotspot positions (as % of the scaled 160% image)
// Based on highlighted reference image analysis
const TROPHY_HOTSPOTS = [
  { tier: 2, x: 25, y: 55, width: 16, height: 35, label: 'Silver' },
  { tier: 3, x: 50, y: 52, width: 18, height: 35, label: 'Gold' },
  { tier: 1, x: 73, y: 55, width: 17, height: 35, label: 'Bronze' },
];

// Map pan positions to center each trophy in the viewport
// Image is 160% width with -30% margin, viewport sees ~62.5% of image
// Calculate offset to center each trophy X position
const MAP_POSITIONS: Record<number, number> = {
  1: -14.5,  // Bronze at 73% -> pan left
  2: 15.5,   // Silver at 25% -> pan right
  3: 0,      // Gold at 50% -> centered
};

export function LeaderboardHeroBackground({ tier, children, onTierSelect, userTier = 1 }: LeaderboardHeroBackgroundProps) {
  const mapOffset = MAP_POSITIONS[tier] || 0;

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
          
          {/* Clickable Trophy Hotspots - positioned over the scaled map */}
          {TROPHY_HOTSPOTS.map((hotspot) => {
            const isLocked = hotspot.tier > userTier;
            const isActive = hotspot.tier === tier;
            
            return (
              <motion.button
                key={hotspot.tier}
                onClick={() => !isLocked && onTierSelect?.(hotspot.tier)}
                disabled={isLocked}
                className={`absolute rounded-xl transition-all duration-200 ${
                  isLocked 
                    ? 'cursor-not-allowed' 
                    : 'cursor-pointer'
                }`}
                style={{
                  left: `${hotspot.x - hotspot.width / 2}%`,
                  top: `${hotspot.y - hotspot.height / 2}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                animate={{
                  boxShadow: isActive && !isLocked
                    ? '0 0 30px 10px rgba(255,255,255,0.15)'
                    : 'none',
                }}
                aria-label={`Select ${hotspot.label} league`}
              />
            );
          })}
        </motion.div>
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
