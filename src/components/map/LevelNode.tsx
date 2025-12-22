import { motion } from "framer-motion";
import { Lock, Crown, Star } from "lucide-react";
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
    locked: "from-pink-200/40 to-rose-200/40",
  },
  summer: {
    bg: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/50",
    ring: "ring-amber-300",
    locked: "from-amber-200/40 to-orange-200/40",
  },
  autumn: {
    bg: "from-orange-500 to-red-600",
    glow: "shadow-orange-500/50",
    ring: "ring-orange-300",
    locked: "from-orange-200/40 to-red-200/40",
  },
  winter: {
    bg: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-500/50",
    ring: "ring-cyan-300",
    locked: "from-cyan-200/40 to-blue-200/40",
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
      {/* Sparkle particles for current level */}
      {isCurrent && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [0, Math.cos((i / 6) * Math.PI * 2) * 50],
                y: [0, Math.sin((i / 6) * Math.PI * 2) * 50],
                opacity: [0.8, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </>
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
            : `bg-gradient-to-br ${colors.locked} backdrop-blur-sm border-2 border-dashed border-muted-foreground/40`,
          isCurrent && `ring-4 ${colors.ring} ring-offset-2 ring-offset-transparent`,
          level.isBoss && isUnlocked && "ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent"
        )}
        style={{ width: nodeSize, height: nodeSize }}
      >
        {/* Inner shine for 3D effect */}
        {isUnlocked && (
          <div 
            className="absolute inset-1 rounded-full bg-white/25"
            style={{ 
              maskImage: "linear-gradient(180deg, white 0%, transparent 60%)",
              WebkitMaskImage: "linear-gradient(180deg, white 0%, transparent 60%)",
            }} 
          />
        )}

        {/* Frosted glass overlay for locked */}
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-full bg-background/30 backdrop-blur-[2px]" />
        )}

        {/* Content - Lock icon for locked, or level number */}
        {!isUnlocked ? (
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <Lock className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-xs text-muted-foreground/60 font-bold">{level.id}</span>
          </div>
        ) : level.isBoss ? (
          <div className="relative z-10 flex flex-col items-center">
            <Crown className="w-6 h-6 text-amber-200" />
            <span className="text-[10px] font-bold text-amber-100">{level.id}</span>
          </div>
        ) : (
          <span className="relative z-10 text-white drop-shadow-md">{level.id}</span>
        )}

        {/* Glow effect for current */}
        {isCurrent && (
          <motion.div
            className={cn("absolute inset-0 rounded-full bg-gradient-to-br", colors.bg)}
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Stars display */}
      {isCompleted && stars > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-0.5">
          {[1, 2, 3].map((star) => (
            <motion.div
              key={star}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: star * 0.1, type: "spring" }}
            >
              <Star
                className={cn(
                  "w-4 h-4 drop-shadow",
                  star <= stars ? "fill-amber-400 text-amber-400" : "fill-muted/50 text-muted/50"
                )}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Boss crown badge (SVG instead of emoji) */}
      {level.isBoss && (
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-2 border-amber-300"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}