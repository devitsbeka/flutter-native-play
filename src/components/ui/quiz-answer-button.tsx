import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type QuizAnswerState = "default" | "selected" | "correct" | "wrong" | "next";

interface QuizAnswerButtonProps {
  state?: QuizAnswerState;
  label?: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

const stateStyles: Record<QuizAnswerState, {
  bg: string;
  border: string;
  borderWidth: number;
  shadow: string;
  textColor: string;
  isGradient?: boolean;
}> = {
  default: {
    bg: "linear-gradient(90deg, #D9D8FF 0%, #ABABE3 100%)",
    border: "#7E7ADB",
    borderWidth: 1,
    shadow: "#6A69B4",
    textColor: "#514F7F",
    isGradient: true,
  },
  selected: {
    bg: "#EDECFF",
    border: "#B9B6FF",
    borderWidth: 4,
    shadow: "#A4A0FF",
    textColor: "#514F7F",
  },
  correct: {
    bg: "#83F7DA",
    border: "#39CBA6",
    borderWidth: 4,
    shadow: "#2CB08F",
    textColor: "#514F7F",
  },
  wrong: {
    bg: "#FF7575",
    border: "#EF4343",
    borderWidth: 4,
    shadow: "#FF6868",
    textColor: "#FFFFFF",
  },
  next: {
    bg: "#EDECFF",
    border: "#B9B6FF",
    borderWidth: 4,
    shadow: "#A4A0FF",
    textColor: "#46447E",
  },
};

const QuizAnswerButton = React.forwardRef<HTMLButtonElement, QuizAnswerButtonProps>(
  ({ state = "default", label = "ა", text, onClick, disabled = false, showLabel = true, className }, ref) => {
    const styles = stateStyles[state];
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative w-full h-[74px] rounded-2xl font-bold text-xl transition-all duration-150",
          "flex items-center justify-start px-6 gap-3",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        style={{
          background: styles.isGradient ? styles.bg : styles.bg,
          border: `${styles.borderWidth}px solid ${styles.border}`,
          boxShadow: isPressed 
            ? `0 1px 0 0 ${styles.shadow}` 
            : `0 4px 0 0 ${styles.shadow}`,
          transform: isPressed ? "translateY(2px)" : "translateY(0)",
          color: styles.textColor,
        }}
      >
        {showLabel && state !== "next" && (
          <span className="font-bold">{label}:</span>
        )}
        <span className={cn(
          "flex-1",
          state === "next" && "text-center"
        )}>
          {text}
        </span>
      </motion.button>
    );
  }
);

QuizAnswerButton.displayName = "QuizAnswerButton";

export { QuizAnswerButton };
