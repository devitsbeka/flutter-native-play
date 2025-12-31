import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlarmClock } from "lucide-react";

export type QuizQuestionCardState = "default" | "loading";

interface QuizQuestionCardProps {
  questionText?: string;
  timeRemaining?: number;
  difficulty?: "easy" | "medium" | "hard";
  state?: QuizQuestionCardState;
  className?: string;
}

const difficultyLabels: Record<string, string> = {
  easy: "მარტივი",
  medium: "საშუალო",
  hard: "რთული",
};

const difficultyColors: Record<string, { bg: string; text: string }> = {
  easy: { bg: "rgba(57, 203, 166, 0.2)", text: "#1E9A7F" },
  medium: { bg: "rgba(242, 200, 96, 0.2)", text: "#B8860B" },
  hard: { bg: "rgba(255, 92, 92, 0.2)", text: "#B83A3A" },
};

// Dynamic font sizing based on question length
function getQuestionStyles(text: string) {
  const length = text.length;
  if (length > 120) return { fontSize: "16px", lineClamp: 4 };
  if (length > 80) return { fontSize: "18px", lineClamp: 3 };
  return { fontSize: "20px", lineClamp: 3 };
}

const QuizQuestionCard = React.forwardRef<HTMLDivElement, QuizQuestionCardProps>(
  (
    {
      questionText = "Loading question...",
      timeRemaining = 15,
      difficulty = "medium",
      state = "default",
      className,
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const questionStyles = getQuestionStyles(questionText);
    const diffStyle = difficultyColors[difficulty] || difficultyColors.medium;
    
    // Timer color based on time remaining
    const getTimerColor = () => {
      if (timeRemaining <= 5) return "#FF5C5C";
      if (timeRemaining <= 10) return "#F2C860";
      return "#CD5C3A";
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative w-full rounded-3xl overflow-hidden",
          className
        )}
        style={{
          backgroundColor: "#F5F4FF",
          border: "3px solid #C9C6FF",
          boxShadow: "0 4px 0 #9C99E8",
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Top row: Timer + Difficulty */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {/* Timer */}
          {isLoading ? (
            <div className="h-8 w-16 bg-[#E5E4FF] rounded-lg animate-pulse" />
          ) : (
            <motion.div 
              className="flex items-center gap-1.5"
              key={timeRemaining}
              animate={timeRemaining <= 5 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <AlarmClock 
                className="w-5 h-5" 
                style={{ color: getTimerColor() }}
              />
              <span 
                className="text-xl font-bold"
                style={{ color: getTimerColor() }}
              >
                {timeRemaining}
              </span>
            </motion.div>
          )}

          {/* Difficulty Badge */}
          {isLoading ? (
            <div className="h-7 w-20 bg-[#E5E4FF] rounded-full animate-pulse" />
          ) : (
            <div
              className="px-3 py-1 rounded-full text-sm font-semibold uppercase"
              style={{
                backgroundColor: diffStyle.bg,
                color: diffStyle.text,
              }}
            >
              {difficultyLabels[difficulty]}
            </div>
          )}
        </div>

        {/* Question Text */}
        <div className="px-4 pb-5 pt-2">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 w-full bg-[#E5E4FF] rounded animate-pulse" />
              <div className="h-5 w-3/4 bg-[#E5E4FF] rounded animate-pulse" />
            </div>
          ) : (
            <p
              className="text-center font-medium leading-relaxed"
              style={{
                color: "#514F7F",
                fontSize: questionStyles.fontSize,
                display: "-webkit-box",
                WebkitLineClamp: questionStyles.lineClamp,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: "3.5em",
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
