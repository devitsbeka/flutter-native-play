import { motion } from "framer-motion";
import { Lock, Check, Star, Trophy } from "lucide-react";

interface MapLevel {
  id: number;
  categoryId: string;
  categoryIcon: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  stars: number;
}

interface ProgressionMapProps {
  levels: MapLevel[];
  onLevelClick: (level: MapLevel) => void;
}

export function ProgressionMap({ levels, onLevelClick }: ProgressionMapProps) {
  return (
    <div className="relative py-8">
      {/* Background path */}
      <svg
        className="absolute left-1/2 top-0 -translate-x-1/2"
        width="100"
        height={levels.length * 120 + 60}
        viewBox={`0 0 100 ${levels.length * 120 + 60}`}
      >
        <path
          d={generatePath(levels.length)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Completed path overlay */}
        <path
          d={generatePath(levels.filter(l => l.isCompleted).length)}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </svg>

      {/* Level nodes */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {levels.map((level, index) => (
          <MapNode
            key={level.id}
            level={level}
            index={index}
            onClick={() => onLevelClick(level)}
          />
        ))}
        
        {/* Trophy at the end */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500"
          style={{
            boxShadow: "0 6px 0 0 hsl(35 90% 40%), 0 12px 24px -4px hsl(0 0% 0% / 0.2)",
          }}
        >
          <Trophy className="h-10 w-10 text-white" />
        </motion.div>
      </div>
    </div>
  );
}

function MapNode({ 
  level, 
  index, 
  onClick 
}: { 
  level: MapLevel; 
  index: number; 
  onClick: () => void;
}) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -20 : 20 }}
      animate={{ opacity: 1, x: isEven ? -40 : 40 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4"
      style={{ flexDirection: isEven ? "row" : "row-reverse" }}
    >
      {/* Level button */}
      <motion.button
        onClick={level.isUnlocked ? onClick : undefined}
        whileHover={level.isUnlocked ? { scale: 1.1 } : undefined}
        whileTap={level.isUnlocked ? { scale: 0.95 } : undefined}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-all ${
          level.isCurrent
            ? "ring-4 ring-primary ring-offset-2 ring-offset-background"
            : ""
        } ${
          !level.isUnlocked 
            ? "cursor-not-allowed opacity-50" 
            : "cursor-pointer"
        }`}
        style={{
          background: level.isCompleted
            ? "linear-gradient(135deg, hsl(var(--success)) 0%, hsl(142 60% 35%) 100%)"
            : level.isUnlocked
            ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(255 60% 50%) 100%)"
            : "hsl(var(--muted))",
          boxShadow: level.isUnlocked
            ? "0 6px 0 0 hsl(0 0% 0% / 0.2), 0 8px 16px -4px hsl(0 0% 0% / 0.2)"
            : "0 4px 0 0 hsl(var(--border))",
        }}
      >
        {!level.isUnlocked ? (
          <Lock className="h-6 w-6 text-muted-foreground" />
        ) : level.isCompleted ? (
          <Check className="h-8 w-8 text-white" />
        ) : (
          <span className="text-white">{level.categoryIcon}</span>
        )}

        {/* Current level pulse */}
        {level.isCurrent && level.isUnlocked && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary"
          />
        )}
      </motion.button>

      {/* Level info */}
      <div className={`text-${isEven ? "left" : "right"}`}>
        <p className="text-sm font-bold text-foreground">Level {level.id}</p>
        {level.isCompleted && (
          <div className={`flex items-center gap-0.5 ${isEven ? "" : "justify-end"}`}>
            {[...Array(3)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < level.stars
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function generatePath(count: number): string {
  if (count === 0) return "";
  
  let path = "M 50 30";
  for (let i = 1; i <= count; i++) {
    const y = 30 + i * 100;
    const x = i % 2 === 0 ? 50 : 50;
    path += ` L ${x} ${y}`;
  }
  return path;
}
