import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import triviaBuzzer from "@/assets/trivia-buzzer.png";

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
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        {isLoading ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Glowing light rays behind icon */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0.2) 40%, transparent 70%)",
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Secondary glow ring */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 60%)",
                filter: "blur(12px)",
              }}
              animate={{
                scale: [1.1, 1.3, 1.1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
            
            {/* The category icon itself */}
            <DynamicIcon
              slug={iconSlug}
              categoryId={categoryId}
              size={size * 0.85}
              className="relative z-10"
            />
          </div>
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
          // No-emoji policy: use a neutral graphic fallback instead of emoji.
          <motion.img
            src={triviaBuzzer}
            alt="Trivia"
            className="object-contain drop-shadow-xl"
            style={{ width: size * 0.72, height: size * 0.72 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          />
        )}
      </div>
    );
  }
);

QuizCategoryIcon.displayName = "QuizCategoryIcon";

export { QuizCategoryIcon };
