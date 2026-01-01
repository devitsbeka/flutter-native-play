import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type QuizCategoryIconState = "default" | "loading";

// Category ID to emoji mapping for fallbacks
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  movies: "🎬",
  film: "🎬",
  cinema: "🎬",
  music: "🎵",
  sports: "⚽",
  science: "🔬",
  history: "📜",
  geography: "🌍",
  art: "🎨",
  literature: "📚",
  technology: "💻",
  food: "🍕",
  nature: "🌿",
  animals: "🐾",
  general: "🎯",
};

function getCategoryEmoji(categoryId?: string): string {
  if (!categoryId) return "🎯";
  const lowerCategoryId = categoryId.toLowerCase();
  
  // Check for exact match first
  if (CATEGORY_EMOJI_MAP[lowerCategoryId]) {
    return CATEGORY_EMOJI_MAP[lowerCategoryId];
  }
  
  // Check if categoryId contains any of the keywords
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (lowerCategoryId.includes(key)) {
      return emoji;
    }
  }
  
  return "🎯";
}

interface QuizCategoryIconProps {
  imageUrl?: string;
  iconSlug?: string;
  questionText?: string;
  categoryId?: string;
  emoji?: string;
  size?: number;
  state?: QuizCategoryIconState;
  className?: string;
}

const QuizCategoryIcon = React.forwardRef<HTMLDivElement, QuizCategoryIconProps>(
  ({ imageUrl, iconSlug, questionText, categoryId, emoji, size = 140, state = "default", className }, ref) => {
    const isLoading = state === "loading";
    const fallbackEmoji = emoji || getCategoryEmoji(categoryId);

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
            {fallbackEmoji}
          </span>
        )}
      </motion.div>
    );
  }
);

QuizCategoryIcon.displayName = "QuizCategoryIcon";

export { QuizCategoryIcon };
