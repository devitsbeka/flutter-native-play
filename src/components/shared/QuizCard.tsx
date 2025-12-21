import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizCardProps {
  icon?: string;
  title: string;
  subtitle?: string;
  questionsCount?: number;
  onClick?: () => void;
  variant?: "default" | "featured" | "recent";
  progress?: number;
  className?: string;
}

export function QuizCard({
  icon = "📚",
  title,
  subtitle,
  questionsCount,
  onClick,
  variant = "default",
  progress,
  className,
}: QuizCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors",
        variant === "default" && "bg-card border border-border hover:border-primary/30",
        variant === "featured" && "bg-primary text-primary-foreground",
        variant === "recent" && "bg-quiz-pink",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
          variant === "default" && "bg-secondary",
          variant === "featured" && "bg-primary-foreground/20",
          variant === "recent" && "bg-card"
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "font-bold truncate",
            variant === "featured" ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={cn(
              "text-sm truncate",
              variant === "featured"
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        )}
        {typeof questionsCount === "number" && (
          <p
            className={cn(
              "text-sm",
              variant === "featured"
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {questionsCount} Quizzes
          </p>
        )}
      </div>

      {/* Progress or Arrow */}
      {typeof progress === "number" ? (
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold">{progress}%</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((dot) => (
              <div
                key={dot}
                className={cn(
                  "w-2 h-2 rounded-full",
                  dot <= Math.ceil(progress / 25)
                    ? "bg-foreground"
                    : "bg-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      ) : (
        <ChevronRight
          className={cn(
            "w-5 h-5",
            variant === "featured"
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}
        />
      )}
    </motion.button>
  );
}
