import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

export type QuizCategoryIconState = "default" | "loading";

interface QuizCategoryIconProps {
  imageUrl?: string;
  iconSlug?: string; // Direct icon slug (highest priority - from question or category)
  categoryId?: string; // Category slug for fallback lookup
  emoji?: string;
  size?: number;
  state?: QuizCategoryIconState;
  className?: string;
}

const QuizCategoryIcon = React.forwardRef<HTMLDivElement, QuizCategoryIconProps>(
  ({ imageUrl, iconSlug, categoryId, emoji, size = 128, state = "default", className }, ref) => {
    const isLoading = state === "loading";

    return (
      <motion.div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {isLoading ? (
          <div 
            className="w-full h-full rounded-2xl bg-white/20 animate-pulse"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
          />
        ) : iconSlug || categoryId ? (
          // Use DynamicIcon for icon library lookup
          <DynamicIcon
            slug={iconSlug}
            categoryId={categoryId}
            size={size}
            className="drop-shadow-lg"
          />
        ) : imageUrl ? (
          <motion.img
            src={imageUrl}
            alt="Category"
            className="w-full h-full object-contain"
            style={{ 
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          />
        ) : (
          <span 
            className="drop-shadow-xl"
            style={{ fontSize: size * 0.7 }}
          >
            {emoji || "🎯"}
          </span>
        )}
      </motion.div>
    );
  }
);

QuizCategoryIcon.displayName = "QuizCategoryIcon";

export { QuizCategoryIcon };
