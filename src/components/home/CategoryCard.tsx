import { motion } from "framer-motion";
import { Lock, ChevronRight, Check } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: string;
  description: string;
  color: string;
  progress: number;
  totalLevels: number;
  isLocked?: boolean;
  onClick?: () => void;
}

export function CategoryCard({
  name,
  icon,
  description,
  color,
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
      className={`relative w-full overflow-hidden rounded-2xl bg-card p-4 text-left transition-all ${
        isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        boxShadow: isLocked 
          ? "0 4px 0 0 hsl(var(--border))" 
          : "0 6px 0 0 hsl(var(--border)), 0 8px 16px -4px hsl(0 0% 0% / 0.1)",
      }}
    >
      {/* Content */}
      <div className="flex items-center gap-3">
        {/* Icon with gradient background */}
        <div 
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-2xl`}
          style={{
            boxShadow: "inset 0 -3px 0 0 hsl(0 0% 0% / 0.15)",
          }}
        >
          {isLocked ? (
            <Lock className="h-6 w-6 text-white/80" />
          ) : (
            icon
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground truncate">{name}</h3>
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
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-muted/20" />
      )}
    </motion.button>
  );
}
