import { memo } from "react";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type DotState = "upcoming" | "current" | "correct" | "wrong";

interface QuizProgressDotsProps {
  total?: number;
  current?: number;
  results?: ("correct" | "wrong" | null)[];
  className?: string;
}

const QuizProgressDots = React.forwardRef<HTMLDivElement, QuizProgressDotsProps>(
  ({ total = 6, current = 0, results = [], className }, ref) => {
    const getDotState = (index: number): DotState => {
      if (index < results.length && results[index] !== null) {
        return results[index] as "correct" | "wrong";
      }
      if (index === current) {
        return "current";
      }
      return "upcoming";
    };

    const dotStyles: Record<DotState, string> = {
      current: "bg-white w-[21px]",
      upcoming: "bg-[#EBEBEB]/40 w-[20px]",
      correct: "bg-emerald-400 w-[21px]",
      wrong: "bg-red-400 w-[21px]",
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center gap-3", className)}
      >
        {Array.from({ length: total }).map((_, index) => {
          const dotState = getDotState(index);
          
          return (
            <motion.div
              key={index}
              className={cn(
                "h-[6px] rounded-full transition-all duration-300",
                dotStyles[dotState]
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: dotState === "current" ? 1.1 : 1, 
                opacity: 1 
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
                delay: index * 0.05,
              }}
              whileHover={{ scale: 1.2 }}
            />
          );
        })}
      </div>
    );
  }
);

QuizProgressDots.displayName = "QuizProgressDots";

const QuizProgressDotsMemo = memo(QuizProgressDots);
export { QuizProgressDotsMemo as QuizProgressDots };
