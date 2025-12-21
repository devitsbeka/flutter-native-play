import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface HexBadgeProps {
  icon?: string;
  color?: "green" | "yellow" | "pink" | "purple" | "coral" | "mint" | "gray";
  locked?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorClasses = {
  green: "bg-success/20 text-success",
  yellow: "bg-quiz-yellow text-foreground",
  pink: "bg-quiz-pink text-foreground",
  purple: "bg-primary/20 text-primary",
  coral: "bg-quiz-coral/20 text-quiz-coral",
  mint: "bg-quiz-mint text-foreground",
  gray: "bg-muted text-muted-foreground",
};

const sizeClasses = {
  sm: "w-12 h-14",
  md: "w-16 h-18",
  lg: "w-20 h-22",
};

export function HexBadge({
  icon = "🏆",
  color = "purple",
  locked = false,
  size = "md",
  className,
}: HexBadgeProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl transition-transform hover:scale-105",
        sizeClasses[size],
        locked ? colorClasses.gray : colorClasses[color],
        className
      )}
      style={{
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
      }}
    >
      {locked ? (
        <Lock className="w-5 h-5" />
      ) : (
        <span className="text-2xl">{icon}</span>
      )}
    </div>
  );
}
