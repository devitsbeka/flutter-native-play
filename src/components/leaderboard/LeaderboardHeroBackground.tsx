import { motion } from "framer-motion";
import { ReactNode } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
}

// Map pan positions for each tier - based on 10-column grid:
// Silver: columns 2-4 (center at 30%), Gold: columns 4-6 (center at 50%), Bronze: columns 6-8 (center at 70%)
// We need to translate the image so the center of each zone is visible
// Image is 160% width, centered means -30% margin
// To center on 30% of image: need more positive translateX
// To center on 70% of image: need more negative translateX
const MAP_POSITIONS: Record<number, number> = {
  1: -18,  // Bronze - center on columns 6-8 (70% of image)
  2: 18,   // Silver - center on columns 2-4 (30% of image)
  3: 0,    // Gold - center on columns 4-6 (50% of image, center)
};

export function LeaderboardHeroBackground({ tier, children }: LeaderboardHeroBackgroundProps) {
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
