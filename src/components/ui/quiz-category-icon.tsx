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
    const borderRadius = Math.round(size * 0.13); // ~18px for 140px size

    return (
      <motion.div
        ref={ref}
        className={cn("relative", className)}
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* 3D depth shadow */}
        <div
          className="absolute inset-0"
          style={{ 
            borderRadius,
            backgroundColor: "#5957A7",
            transform: "translateY(5px)",
          }}
        />

        {/* Main container */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius,
            border: "3px solid #9C99E8",
            backgroundColor: "#F5F4FF",
          }}
        >
          {isLoading ? (
            <div className="w-full h-full bg-[#E5E4FF] animate-pulse" />
          ) : imageUrl ? (
            <motion.img
              src={imageUrl}
              alt="Category"
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#EDECFF] to-[#D8D6FF] flex items-center justify-center">
              <span className="text-4xl">❓</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

QuizCategoryIcon.displayName = "QuizCategoryIcon";

export { QuizCategoryIcon };
