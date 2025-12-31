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
  faceBg: string;
  borderColor: string;
  depthColor: string;
  textColor: string;
  labelBg?: string;
}> = {
  default: {
    faceBg: "linear-gradient(180deg, #E8E7FF 0%, #D4D3F5 100%)",
    borderColor: "#9D99E8",
    depthColor: "#7A76C9",
    textColor: "#514F7F",
    labelBg: "rgba(125, 121, 200, 0.15)",
  },
  selected: {
    faceBg: "linear-gradient(180deg, #F5F4FF 0%, #E8E7FF 100%)",
    borderColor: "#B9B6FF",
    depthColor: "#8A86D9",
    textColor: "#514F7F",
    labelBg: "rgba(185, 182, 255, 0.3)",
  },
  correct: {
    faceBg: "linear-gradient(180deg, #9CFCE8 0%, #6EE7C8 100%)",
    borderColor: "#39CBA6",
    depthColor: "#22A085",
    textColor: "#1A5C4B",
    labelBg: "rgba(57, 203, 166, 0.2)",
  },
  wrong: {
    faceBg: "linear-gradient(180deg, #FF9494 0%, #FF6B6B 100%)",
    borderColor: "#EF4343",
    depthColor: "#C62828",
    textColor: "#FFFFFF",
    labelBg: "rgba(255, 255, 255, 0.2)",
  },
  next: {
    faceBg: "linear-gradient(180deg, #F5F4FF 0%, #E8E7FF 100%)",
    borderColor: "#B9B6FF",
    depthColor: "#8A86D9",
    textColor: "#46447E",
  },
};

const QuizAnswerButton = React.forwardRef<HTMLButtonElement, QuizAnswerButtonProps>(
  ({ state = "default", label = "ა", text, onClick, disabled = false, showLabel = true, className }, ref) => {
    const styles = stateStyles[state];
    const [isPressed, setIsPressed] = React.useState(false);

    const depthHeight = 6;

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
          "relative w-full rounded-2xl font-bold text-xl",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          className
        )}
        style={{
          marginBottom: depthHeight,
        }}
      >
        {/* Depth/Shadow Layer */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: styles.depthColor,
            transform: `translateY(${isPressed ? 2 : depthHeight}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
        
        {/* Main Face */}
        <div
          className="relative flex items-center h-[70px] rounded-2xl border-[3px] transition-transform duration-100"
          style={{
            background: styles.faceBg,
            borderColor: styles.borderColor,
            transform: `translateY(${isPressed ? 4 : 0}px)`,
            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.05)`,
          }}
        >
          {/* Label Badge */}
          {showLabel && state !== "next" && (
            <div
              className="flex items-center justify-center w-14 h-10 ml-4 rounded-xl font-bold text-lg"
              style={{
                background: styles.labelBg,
                color: styles.textColor,
              }}
            >
              {label}:
            </div>
          )}
          
          {/* Text */}
          <span
            className={cn(
              "flex-1 px-4",
              state === "next" ? "text-center" : "text-left"
            )}
            style={{ color: styles.textColor }}
          >
            {text}
          </span>
        </div>
      </motion.button>
    );
  }
);

QuizAnswerButton.displayName = "QuizAnswerButton";

export { QuizAnswerButton };
