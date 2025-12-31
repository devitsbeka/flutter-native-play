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
  ({ imageUrl, size = 120, state = "default", className }, ref) => {
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
        {/* 3D depth shadow */}
        <div
          className="absolute inset-0 rounded-[18px] bg-[#5957A7]"
          style={{ transform: "translateY(4px)" }}
        />

        {/* Main container */}
        <div className="relative w-full h-full rounded-[18px] overflow-hidden border-[3px] border-[#9C99E8] bg-[#F5F4FF]">
          {isLoading ? (
            <div className="w-full h-full bg-muted animate-pulse" />
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
