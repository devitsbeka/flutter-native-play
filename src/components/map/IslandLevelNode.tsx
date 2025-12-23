import { motion } from "framer-motion";

import level1Star from "@/assets/map/level-1-star.svg";
import level2Stars from "@/assets/map/level-2-stars.svg";
import level3Stars from "@/assets/map/level-3-stars.svg";
import levelLocked from "@/assets/map/level-locked.svg";
import levelCurrent from "@/assets/map/level-current.svg";

export interface LevelState {
  id: number;
  isLocked: boolean;
  isCurrent: boolean;
  stars: 0 | 1 | 2 | 3;
}

interface IslandLevelNodeProps {
  level: LevelState;
  position: { x: number; y: number };
  onClick: (levelId: number) => void;
  index: number;
}

// Different SVG types have different dimensions and anchor points
// Locked/Current: ~128x115 (button centered)
// Star SVGs: ~128x200-205 (button at bottom, stars on top)
const NODE_CONFIG = {
  locked: { width: 48, height: 43, offsetY: 50 },    // Center anchor
  current: { width: 48, height: 43, offsetY: 50 },   // Center anchor  
  stars: { width: 56, height: 90, offsetY: 75 },     // Bottom anchor (button sits on road)
};

export function IslandLevelNode({ level, position, onClick, index }: IslandLevelNodeProps) {
  const getSvgSource = () => {
    if (level.isLocked) return levelLocked;
    if (level.isCurrent) return levelCurrent;
    if (level.stars === 3) return level3Stars;
    if (level.stars === 2) return level2Stars;
    if (level.stars >= 1) return level1Star;
    return levelCurrent; // Fallback for completed with 0 stars
  };

  const getNodeConfig = () => {
    if (level.isLocked) return NODE_CONFIG.locked;
    if (level.isCurrent) return NODE_CONFIG.current;
    if (level.stars > 0) return NODE_CONFIG.stars;
    return NODE_CONFIG.current;
  };

  const handleClick = () => {
    if (!level.isLocked) {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onClick(level.id);
    }
  };

  const config = getNodeConfig();
  const isStarLevel = !level.isLocked && !level.isCurrent && level.stars > 0;

  return (
    <motion.button
      className="absolute focus:outline-none touch-manipulation"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${config.width}px`,
        height: `${config.height}px`,
        transform: `translate(-50%, -${config.offsetY}%)`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 400,
        damping: 20,
      }}
      whileTap={!level.isLocked ? { scale: 0.9 } : undefined}
      onClick={handleClick}
      disabled={level.isLocked}
    >
      {/* Pulse animation for current level */}
      {level.isCurrent && (
        <motion.div
          className="absolute rounded-full bg-amber-400/30"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "50px",
            height: "50px",
          }}
        />
      )}
      
      {/* Level SVG */}
      <img 
        src={getSvgSource()} 
        alt={`Level ${level.id}`}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      
      {/* Level number overlay for current level only */}
      {level.isCurrent && (
        <div 
          className="absolute font-bold text-white text-base"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {level.id}
        </div>
      )}
    </motion.button>
  );
}
