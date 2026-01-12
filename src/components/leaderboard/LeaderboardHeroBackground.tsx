import { motion } from "framer-motion";
import { ReactNode } from "react";
import gameMapBg from "@/assets/gamemap.jpg";

interface LeaderboardHeroBackgroundProps {
  tier: number;
  children: ReactNode;
}

// Map pan positions for each tier (percentage offset)
const MAP_POSITIONS: Record<number, number> = {
  1: 15,   // Bronze - pan right to show right area
  2: -15,  // Silver - pan left to show left area
  3: 0,    // Gold - center
  4: -8,   // Diamond - slightly left
  5: -20,  // Champion - far left
};

export function LeaderboardHeroBackground({ tier, children }: LeaderboardHeroBackgroundProps) {
  const mapOffset = MAP_POSITIONS[tier] || 0;

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Pannable Map Background */}
      <div className="absolute inset-0 h-[110%]">
        <motion.div
          className="absolute inset-0 w-[150%] h-full"
          style={{ marginLeft: '-25%' }}
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
            className="w-full h-full object-cover object-center"
          />
        </motion.div>
      </div>
      
      {/* Fade to white gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent z-[5]" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
