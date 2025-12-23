import { motion } from "framer-motion";

import levelCompleted from "@/assets/map/level-completed.svg";
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
  onLockedClick: (levelId: number) => void;
  index: number;
}

// All nodes now use the same size (128x115 aspect ratio)
const NODE_SIZE = { width: 72, height: 65 };

export function IslandLevelNode({ level, position, onClick, onLockedClick, index }: IslandLevelNodeProps) {
  const getSvgSource = () => {
    if (level.isLocked) return levelLocked;
    if (level.isCurrent) return levelCurrent;
    // All completed levels use the green checkmark
    return levelCompleted;
  };

  const isCompleted = !level.isLocked && !level.isCurrent;

  const handleClick = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    if (level.isLocked) {
      onLockedClick(level.id);
    } else {
      onClick(level.id);
    }
  };

  return (
    <motion.button
      className="absolute focus:outline-none touch-manipulation"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${NODE_SIZE.width}px`,
        height: `${NODE_SIZE.height}px`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 400,
        damping: 20,
      }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
    >
      {/* Pulse animation for current level */}
      {level.isCurrent && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            className="rounded-full bg-amber-400/30"
            style={{ width: 50, height: 50 }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
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
          className="absolute font-bold text-amber-900 text-base"
          style={{
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
          }}
        >
          {level.id}
        </div>
      )}
    </motion.button>
  );
}