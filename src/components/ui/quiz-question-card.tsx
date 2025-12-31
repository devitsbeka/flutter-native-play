import * as React from "react";
import { motion } from "framer-motion";
import { AlarmClock } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizQuestionCardState = "default" | "loading";

interface QuizQuestionCardProps {
  questionText?: string;
  timeRemaining?: number;
  difficulty?: "easy" | "medium" | "hard";
  state?: QuizQuestionCardState;
  className?: string;
}

const difficultyLabels = {
  easy: "ᲛᲐᲠᲢᲘᲕᲘ",
  medium: "ᲡᲐᲨᲣᲐᲚᲝ",
  hard: "ᲠᲗᲣᲚᲘ",
};

const difficultyColors = {
  easy: "text-emerald-500",
  medium: "text-[#FF7F25]",
  hard: "text-red-500",
};

// Truncate question text with dynamic font sizing
const getQuestionStyles = (text: string) => {
  const len = text.length;
  if (len > 100) return { fontSize: "16px", lineClamp: 3 };
  if (len > 80) return { fontSize: "18px", lineClamp: 3 };
  return { fontSize: "20px", lineClamp: 3 };
};

const QuizQuestionCard = React.forwardRef<HTMLDivElement, QuizQuestionCardProps>(
  (
    {
      questionText = "What is the question?",
      timeRemaining = 10,
      difficulty = "medium",
      state = "default",
      className,
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const questionStyles = getQuestionStyles(questionText);

    // Truncate text if too long
    const displayText =
      questionText.length > 120
        ? questionText.substring(0, 117) + "..."
        : questionText;

    return (
      <motion.div
        ref={ref}
        className={cn(
          "w-full max-w-[320px] bg-white/95 rounded-[20px] p-4 shadow-lg",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Timer and Difficulty Row */}
        <div className="flex items-center justify-between mb-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <AlarmClock className="w-5 h-5 text-[#CD5C3A]" />
                <span className="text-base font-bold text-[#CD5C3A] font-['TA_Solivare']">
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
                "text-sm font-bold font-['TA_Solivare'] tracking-wide",
                difficultyColors[difficulty]
              )}
            >
              {difficultyLabels[difficulty]}
            </span>
          )}
        </div>

        {/* Question Text */}
        <div className="w-full">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded animate-pulse" />
              <div className="h-5 bg-muted rounded animate-pulse w-3/4 mx-auto" />
            </div>
          ) : (
            <motion.p
              className="font-bold text-[#514F7F] text-center font-['Google_Sans'] leading-snug"
              style={{
                fontSize: questionStyles.fontSize,
                display: "-webkit-box",
                WebkitLineClamp: questionStyles.lineClamp,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {displayText}
            </motion.p>
          )}
        </div>
      </motion.div>
    );
  }
);

QuizQuestionCard.displayName = "QuizQuestionCard";

export { QuizQuestionCard };
