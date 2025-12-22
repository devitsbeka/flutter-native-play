import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star, Trophy } from "lucide-react";

export interface MapLevel {
  id: number;
  categoryId: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  stars: number;
}

interface GameLevelMapProps {
  levels: MapLevel[];
  onLevelClick: (level: MapLevel) => void;
}

// Zone colors for different sections of the map
const zoneColors = [
  { bg: "from-emerald-500/20 to-green-600/30", path: "hsl(var(--success))" },
  { bg: "from-sky-500/20 to-blue-600/30", path: "hsl(var(--primary))" },
  { bg: "from-amber-500/20 to-orange-600/30", path: "hsl(142 76% 36%)" },
  { bg: "from-purple-500/20 to-indigo-600/30", path: "hsl(var(--primary))" },
  { bg: "from-rose-500/20 to-pink-600/30", path: "hsl(var(--destructive))" },
];

export const GameLevelMap: React.FC<GameLevelMapProps> = ({ levels, onLevelClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to current level
    if (currentLevelRef.current && containerRef.current) {
      setTimeout(() => {
        currentLevelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [levels]);

  // Calculate level positions in a winding pattern
  const getLevelPosition = (index: number) => {
    const pattern = [20, 50, 80, 50]; // Left, Center, Right, Center
    const patternIndex = index % pattern.length;
    return pattern[patternIndex];
  };

  // Generate the winding SVG path
  const generateWindingPath = () => {
    if (levels.length === 0) return "";
    
    const points: { x: number; y: number }[] = [];
    const levelSpacing = 140;
    
    levels.forEach((_, index) => {
      const x = getLevelPosition(index);
      const y = 80 + index * levelSpacing;
      points.push({ x, y });
    });

    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      
      // Create smooth bezier curve
      path += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  const getZone = (index: number) => {
    const zoneSize = 5;
    return zoneColors[Math.floor(index / zoneSize) % zoneColors.length];
  };

  const mapHeight = 80 + levels.length * 140 + 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-y-auto overflow-x-hidden pb-24"
      style={{ maxHeight: "calc(100vh - 200px)" }}
    >
      {/* Background zones */}
      <div className="absolute inset-0 w-full" style={{ height: mapHeight }}>
        {Array.from({ length: Math.ceil(levels.length / 5) }).map((_, zoneIndex) => (
          <div
            key={zoneIndex}
            className={`absolute w-full h-[700px] bg-gradient-to-b ${zoneColors[zoneIndex % zoneColors.length].bg}`}
            style={{ top: zoneIndex * 700 }}
          />
        ))}
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none" style={{ height: mapHeight }}>
        {levels.map((_, index) => {
          if (index % 3 !== 0) return null;
          const side = index % 6 < 3 ? "left-4" : "right-4";
          return (
            <div
              key={`deco-${index}`}
              className={`absolute ${side}`}
              style={{ top: 100 + index * 140 }}
            >
              <div className="w-8 h-8 rounded-full bg-success/20 blur-sm" />
            </div>
          );
        })}
      </div>

      {/* SVG Path */}
      <svg
        className="absolute inset-0 w-full pointer-events-none"
        style={{ height: mapHeight }}
        viewBox={`0 0 100 ${mapHeight}`}
        preserveAspectRatio="none"
      >
        {/* Path shadow */}
        <path
          d={generateWindingPath()}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="0"
          className="opacity-50"
          style={{ filter: "blur(4px)", transform: "translateY(4px)" }}
        />
        {/* Main path */}
        <path
          d={generateWindingPath()}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="12 8"
        />
      </svg>

      {/* Level nodes */}
      <div className="relative" style={{ height: mapHeight }}>
        {levels.map((level, index) => (
          <LevelNode
            key={level.id}
            level={level}
            index={index}
            position={getLevelPosition(index)}
            onClick={() => onLevelClick(level)}
            ref={level.isCurrent ? currentLevelRef : null}
            isMilestone={(index + 1) % 5 === 0}
          />
        ))}

        {/* Trophy at the end */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 80 + levels.length * 140 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface LevelNodeProps {
  level: MapLevel;
  index: number;
  position: number;
  onClick: () => void;
  isMilestone: boolean;
}

const LevelNode = React.forwardRef<HTMLDivElement, LevelNodeProps>(
  ({ level, index, position, onClick, isMilestone }, ref) => {
    const isLocked = !level.isUnlocked;
    const isCompleted = level.isCompleted;
    const isCurrent = level.isCurrent;

    const getNodeStyles = () => {
      if (isLocked) {
        return {
          bg: "bg-muted",
          shadow: "shadow-[0_6px_0_0_hsl(var(--muted-foreground)/0.3)]",
          border: "border-muted-foreground/30",
        };
      }
      if (isCompleted) {
        return {
          bg: "bg-success",
          shadow: "shadow-[0_6px_0_0_hsl(var(--success)/0.5)]",
          border: "border-success/50",
        };
      }
      return {
        bg: "bg-primary",
        shadow: "shadow-[0_6px_0_0_hsl(var(--primary)/0.5)]",
        border: "border-primary/50",
      };
    };

    const styles = getNodeStyles();
    const nodeSize = isMilestone ? "w-20 h-20" : "w-16 h-16";
    const levelSpacing = 140;

    return (
      <div
        ref={ref}
        className="absolute -translate-x-1/2"
        style={{
          left: `${position}%`,
          top: 80 + index * levelSpacing - (isMilestone ? 8 : 0),
        }}
      >
        <motion.button
          className={`
            relative ${nodeSize} rounded-full
            ${styles.bg} ${styles.shadow}
            border-4 ${styles.border}
            flex items-center justify-center
            transition-all duration-200
            ${isLocked ? "cursor-not-allowed" : "cursor-pointer active:translate-y-1 active:shadow-[0_2px_0_0_hsl(var(--muted-foreground)/0.3)]"}
          `}
          onClick={() => !isLocked && onClick()}
          whileHover={!isLocked ? { scale: 1.05 } : {}}
          whileTap={!isLocked ? { scale: 0.98 } : {}}
          animate={
            isCurrent
              ? {
                  boxShadow: [
                    "0 0 0 0 hsl(var(--primary) / 0.4)",
                    "0 0 0 12px hsl(var(--primary) / 0)",
                    "0 0 0 0 hsl(var(--primary) / 0)",
                  ],
                }
              : {}
          }
          transition={
            isCurrent
              ? { duration: 1.5, repeat: Infinity, ease: "easeOut" }
              : {}
          }
        >
          {isLocked ? (
            <Lock className="w-6 h-6 text-muted-foreground" />
          ) : isCompleted ? (
            <Check className="w-8 h-8 text-success-foreground font-bold" strokeWidth={3} />
          ) : (
            <span className="text-xl font-bold text-primary-foreground">
              {index + 1}
            </span>
          )}

          {/* Milestone crown/badge */}
          {isMilestone && !isLocked && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
          )}
        </motion.button>

        {/* Stars for completed levels */}
        {isCompleted && level.stars > 0 && (
          <div className="flex justify-center gap-0.5 mt-2">
            {[1, 2, 3].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= level.stars
                    ? "text-amber-400 fill-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* Level number label for locked/current */}
        {!isCompleted && (
          <div className="text-center mt-1">
            <span className="text-xs font-medium text-muted-foreground">
              Level {index + 1}
            </span>
          </div>
        )}
      </div>
    );
  }
);

LevelNode.displayName = "LevelNode";
