import * as React from "react";
import { motion } from "framer-motion";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizQuestionCardState = "default" | "loading";

interface QuizQuestionCardProps {
  imageUrl?: string;
  questionText?: string;
  timeRemaining?: number;
  difficulty?: "easy" | "medium" | "hard";
  state?: QuizQuestionCardState;
  className?: string;
}

const difficultyLabels = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

const difficultyColors = {
  easy: "text-emerald-500",
  medium: "text-[#FF7F25]",
  hard: "text-red-500",
};

const QuizQuestionCard = React.forwardRef<HTMLDivElement, QuizQuestionCardProps>(
  (
    {
      imageUrl,
      questionText = "What is the question?",
      timeRemaining = 10,
      difficulty = "medium",
      state = "default",
      className,
    },
    ref
  ) => {
    const isLoading = state === "loading";

    return (
      <motion.div
        ref={ref}
        className={cn("flex flex-col items-center gap-4", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Question Image */}
        {imageUrl && (
          <motion.div
            className="w-[196px] h-[196px] rounded-[18px] overflow-hidden"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {isLoading ? (
              <div className="w-full h-full bg-muted animate-pulse" />
            ) : (
              <img
                src={imageUrl}
                alt="Question"
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        )}

        {/* Timer and Difficulty Row */}
        <div className="flex items-center justify-between w-full max-w-[320px]">
          {/* Timer */}
          <div className="flex items-center gap-1">
            {isLoading ? (
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <Timer className="w-5 h-5 text-[#CD5C3A] rotate-180" />
                <span className="text-sm font-bold text-[#CD5C3A] font-['TA_Solivare']">
                  {timeRemaining}
                </span>
              </>
            )}
          </div>

          {/* Difficulty Badge */}
          {isLoading ? (
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          ) : (
            <span
              className={cn(
                "text-sm font-bold font-['TA_Solivare']",
                difficultyColors[difficulty]
              )}
            >
              {difficultyLabels[difficulty]}
            </span>
          )}
        </div>

        {/* Question Text */}
        <div className="w-full max-w-[320px]">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-6 bg-muted rounded animate-pulse w-3/4 mx-auto" />
            </div>
          ) : (
            <motion.p
              className="text-xl font-bold text-[#514F7F] text-center font-['Google_Sans']"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {questionText}
            </motion.p>
          )}
        </div>
      </motion.div>
    );
  }
);

QuizQuestionCard.displayName = "QuizQuestionCard";

export { QuizQuestionCard };
