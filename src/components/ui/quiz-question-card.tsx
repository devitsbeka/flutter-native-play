import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type QuizQuestionCardState = "default" | "loading";

interface QuizQuestionCardProps {
  questionText?: string;
  questionNumber?: number;
  totalQuestions?: number;
  progressPercent?: number;
  state?: QuizQuestionCardState;
  className?: string;
  difficultyLabel?: string;
  difficultyColor?: string;
  timerSeconds?: number;
  timerMaxSeconds?: number;
}

// Dynamic font sizing based on question length - conservative for viewport fit
function getQuestionStyles(text: string) {
  const length = text.length;
  if (length > 55) return { fontSize: "16px" };
  if (length > 40) return { fontSize: "17px" };
  return { fontSize: "18px" };
}

const QuizQuestionCard = React.forwardRef<HTMLDivElement, QuizQuestionCardProps>(
  (
    {
      questionText = "Loading question...",
      questionNumber,
      totalQuestions,
      progressPercent = 0,
      state = "default",
      className,
      difficultyLabel,
      difficultyColor,
      timerSeconds,
      timerMaxSeconds = 20,
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const questionStyles = getQuestionStyles(questionText);
    const isLowTime = timerSeconds !== undefined && timerSeconds <= 5;

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative w-full rounded-2xl overflow-hidden",
          className
        )}
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 4px 0 #CBD5E1",
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Timer badge - top left corner */}
        {timerSeconds !== undefined && (
          <div className="absolute top-3 left-3 z-10">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                isLowTime ? "bg-destructive animate-pulse" : "bg-primary"
              )}
              style={{
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              {timerSeconds}
            </div>
          </div>
        )}

        {/* Difficulty badge - top right corner */}
        {difficultyLabel && (
          <div className="absolute top-3 right-3 z-10">
            <span 
              className={cn(
                "px-2 py-0.5 rounded-full text-white text-[10px] font-bold",
                difficultyColor
              )}
            >
              {difficultyLabel}
            </span>
          </div>
        )}
        {/* Question counter (optional) */}
        {questionNumber && totalQuestions && (
          <div className="flex justify-center pt-4">
            <span className="text-[#7E6AAE] text-sm font-medium">
              {questionNumber}/{totalQuestions}
            </span>
          </div>
        )}

        {/* Question Text */}
        <div className={cn(
          "px-5 py-3",
          (timerSeconds !== undefined || difficultyLabel) && "pt-12"
        )}>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          ) : (
            <p
              className="text-center font-semibold leading-snug text-[#2A2550] line-clamp-3"
              style={{
                fontSize: questionStyles.fontSize,
              }}
            >
              {questionText}
            </p>
          )}
        </div>

        {/* Progress bar at bottom */}
        <div className="h-2 bg-gray-200 w-full">
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background: "linear-gradient(90deg, #F5A623 0%, #F7C948 100%)",
              width: `${progressPercent}%`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    );
  }
);

QuizQuestionCard.displayName = "QuizQuestionCard";

export { QuizQuestionCard };
