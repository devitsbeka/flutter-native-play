import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type QuizCategoryIconState = "default" | "loading";

interface QuizCategoryIconProps {
  imageUrl?: string;
  size?: number;
  state?: QuizCategoryIconState;
  className?: string;
}

const QuizCategoryIcon = React.forwardRef<HTMLDivElement, QuizCategoryIconProps>(
  ({ imageUrl, size = 140, state = "default", className }, ref) => {
    const isLoading = state === "loading";

    return (
      <motion.div
        ref={ref}
        className={cn("relative", className)}
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
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
          >
            <span className="text-5xl">🍿</span>
          </div>
        )}
      </motion.div>
    );
  }
);

QuizCategoryIcon.displayName = "QuizCategoryIcon";

export { QuizCategoryIcon };
