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
}

// Dynamic font sizing based on question length
function getQuestionStyles(text: string) {
  const length = text.length;
  if (length > 200) return { fontSize: "14px" };
  if (length > 150) return { fontSize: "15px" };
  if (length > 100) return { fontSize: "16px" };
  if (length > 60) return { fontSize: "18px" };
  return { fontSize: "20px" };
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
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const questionStyles = getQuestionStyles(questionText);

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative w-full rounded-3xl overflow-hidden",
          className
        )}
        style={{
          backgroundColor: "#6B5FA8",
          boxShadow: "0 6px 0 #4A4080",
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Progress bar at top */}
        <div className="h-2 bg-white/20 w-full">
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

        {/* Question counter (optional) */}
        {questionNumber && totalQuestions && (
          <div className="flex justify-center pt-3">
            <span className="text-white/60 text-sm font-medium">
              {questionNumber}/{totalQuestions}
            </span>
          </div>
        )}

        {/* Question Text */}
        <div className="px-5 py-5">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 w-full bg-white/20 rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-white/20 rounded animate-pulse mx-auto" />
            </div>
          ) : (
            <p
              className="text-center font-semibold leading-relaxed text-white"
              style={{
                fontSize: questionStyles.fontSize,
              }}
            >
              {questionText}
            </p>
          )}
        </div>
      </motion.div>
    );
  }
);

QuizQuestionCard.displayName = "QuizQuestionCard";

export { QuizQuestionCard };
