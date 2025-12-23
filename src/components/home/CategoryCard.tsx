import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: string;
  description: string;
  color?: string;
  progress: number;
  totalLevels: number;
  isLocked?: boolean;
  onClick?: () => void;
}

export function CategoryCard({
  name,
  icon,
  description,
  progress,
  totalLevels,
  isLocked = false,
  onClick,
}: CategoryCardProps) {
  const progressPercent = (progress / totalLevels) * 100;
  const isCompleted = progress >= totalLevels;

  return (
    <motion.button
      onClick={isLocked ? undefined : onClick}
      whileHover={isLocked ? undefined : { scale: 1.02, y: -2 }}
      whileTap={isLocked ? undefined : { scale: 0.98 }}
      className={`liquid-glass relative w-full overflow-hidden rounded-2xl p-4 text-left transition-all min-h-[140px] ${
        isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Content - Vertical Layout */}
      <div className="flex flex-col h-full">
        {/* Top Row: Icon and Status */}
        <div className="flex items-start justify-between mb-3">
          {/* Large Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/10 text-3xl">
            {isLocked ? (
              <Lock className="h-6 w-6 text-muted-foreground" />
            ) : (
              icon
            )}
          </div>
          
          {/* Completion Badge */}
          {isCompleted && !isLocked && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
              <Check className="h-4 w-4 text-success-foreground" />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground text-base leading-tight mb-1 line-clamp-2">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        </div>

        {/* Progress bar at bottom */}
        {!isLocked && (
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                პროგრესი
              </span>
              <span className="text-xs font-bold text-foreground">
                {progress}/{totalLevels}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isCompleted 
                    ? "bg-success" 
                    : "bg-foreground/40"
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/20" />
      )}
    </motion.button>
  );
}
