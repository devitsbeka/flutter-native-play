import { motion } from "framer-motion";
import { Lock, Crown, Star, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Season } from "./SeasonalAdventureMap";

interface Level {
  id: number;
  season: Season;
  x: number;
  y: number;
  isBoss: boolean;
}

interface LevelNodeProps {
  level: Level;
  isCompleted: boolean;
  isCurrent: boolean;
  isUnlocked: boolean;
  stars: number;
  onClick: () => void;
}

const seasonColors = {
  spring: {
    bg: "from-pink-400 to-rose-500",
    glow: "shadow-pink-500/50",
    ring: "ring-pink-300",
  },
  summer: {
    bg: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/50",
    ring: "ring-amber-300",
  },
  autumn: {
    bg: "from-orange-500 to-red-600",
    glow: "shadow-orange-500/50",
    ring: "ring-orange-300",
  },
  winter: {
    bg: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-500/50",
    ring: "ring-cyan-300",
  },
};

export function LevelNode({ level, isCompleted, isCurrent, isUnlocked, stars, onClick }: LevelNodeProps) {
  const colors = seasonColors[level.season];
  const nodeSize = level.isBoss ? 72 : 56;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${level.x}%`,
        top: `${level.y}vh`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: level.id * 0.03, type: "spring", stiffness: 200 }}
    >
      {/* Current level indicator - bouncing arrow */}
      {isCurrent && (
        <motion.div
          className="absolute -top-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-8 h-8 bg-primary rounded-lg rotate-45 shadow-lg shadow-primary/50 flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground -rotate-45 ml-0.5" />
          </div>
        </motion.div>
      )}

      {/* Main node button */}
      <motion.button
        whileHover={isUnlocked ? { scale: 1.15 } : {}}
        whileTap={isUnlocked ? { scale: 0.95 } : {}}
        onClick={onClick}
        disabled={!isUnlocked}
        className={cn(
          "relative rounded-full flex items-center justify-center font-display text-lg font-bold transition-all",
          isUnlocked 
            ? `bg-gradient-to-br ${colors.bg} text-white shadow-xl ${colors.glow}` 
            : "bg-muted/80 text-muted-foreground",
          isCurrent && `ring-4 ${colors.ring} ring-offset-2 ring-offset-background animate-pulse`,
          level.isBoss && "ring-4 ring-amber-400 ring-offset-2 ring-offset-background"
        )}
        style={{ width: nodeSize, height: nodeSize }}
      >
        {/* Inner shadow for 3D effect */}
        <div className={cn(
          "absolute inset-1 rounded-full",
          isUnlocked ? "bg-white/20" : "bg-black/10"
        )} style={{ top: 2, bottom: "50%" }} />

        {/* Content */}
        {!isUnlocked ? (
          <Lock className="w-5 h-5" />
        ) : level.isBoss ? (
          <Crown className="w-6 h-6 text-amber-300" />
        ) : (
          <span className="relative z-10">{level.id}</span>
        )}

        {/* Glow effect for current */}
        {isCurrent && (
          <motion.div
            className={cn("absolute inset-0 rounded-full bg-gradient-to-br", colors.bg)}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Stars display */}
      {isCompleted && stars > 0 && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[1, 2, 3].map((star) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: star * 0.1, type: "spring" }}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  star <= stars ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                )}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Boss badge */}
      {level.isBoss && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs">👑</span>
        </motion.div>
      )}
    </motion.div>
  );
}
