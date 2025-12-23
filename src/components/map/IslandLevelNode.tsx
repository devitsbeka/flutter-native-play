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

export function IslandLevelNode({ level, position, onClick, index }: IslandLevelNodeProps) {
  const getSvgSource = () => {
    if (level.isLocked) return levelLocked;
    if (level.isCurrent) return levelCurrent;
    if (level.stars === 3) return level3Stars;
    if (level.stars === 2) return level2Stars;
    if (level.stars >= 1) return level1Star;
    return levelCurrent;
  };

  const handleClick = () => {
    if (!level.isLocked) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onClick(level.id);
    }
  };

  return (
    <motion.button
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none touch-manipulation"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: "64px",
        height: "80px",
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
          className="absolute inset-0 rounded-full bg-amber-400/30"
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
            top: "40%",
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
      
      {/* Level number overlay for current/playable levels */}
      {!level.isLocked && level.isCurrent && (
        <div 
          className="absolute font-bold text-white text-lg"
          style={{
            left: "50%",
            top: "35%",
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
