import { motion } from "framer-motion";
import { Lock, ChevronRight, Check } from "lucide-react";

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
      className={`liquid-glass relative w-full overflow-hidden rounded-2xl p-4 text-left transition-all ${
        isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Content */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground/10 text-2xl">
          {isLocked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            icon
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-foreground truncate">{name}</h3>
            {isCompleted && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                <Check className="h-3 w-3 text-success-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
          
          {/* Progress bar */}
          {!isLocked && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-foreground/40"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {progress}/{totalLevels}
              </span>
            </div>
          )}
        </div>

        {/* Arrow */}
        {!isLocked && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10">
            <ChevronRight className="h-4 w-4 text-foreground" />
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
