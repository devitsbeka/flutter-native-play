import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

export type QuizAnswerState = "default" | "selected" | "correct" | "wrong" | "next" | "loading" | "disabled";

interface QuizAnswerButtonProps {
  state?: QuizAnswerState;
  label?: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

const stateStyles: Record<Exclude<QuizAnswerState, "loading" | "disabled">, {
  faceBg: string;
  borderColor: string;
  depthColor: string;
  textColor: string;
  labelBg?: string;
}> = {
  default: {
    faceBg: "#D9D8FF",
    borderColor: "#B9B6FF",
    depthColor: "#6A69B4",
    textColor: "#514F7F",
    labelBg: "rgba(126, 122, 219, 0.2)",
  },
  selected: {
    faceBg: "#EDECFF",
    borderColor: "#C9C7FF",
    depthColor: "#7A78C9",
    textColor: "#514F7F",
    labelBg: "rgba(185, 182, 255, 0.3)",
  },
  correct: {
    faceBg: "#83F7DA",
    borderColor: "#5EDAD0",
    depthColor: "#1E9A7F",
    textColor: "#1A5C4B",
    labelBg: "rgba(57, 203, 166, 0.25)",
  },
  wrong: {
    faceBg: "#FF7575",
    borderColor: "#FF5C5C",
    depthColor: "#B83A3A",
    textColor: "#FFFFFF",
    labelBg: "rgba(255, 255, 255, 0.25)",
  },
  next: {
    faceBg: "#EDECFF",
    borderColor: "#C9C7FF",
    depthColor: "#7A78C9",
    textColor: "#46447E",
  },
};

const QuizAnswerButton = React.forwardRef<HTMLButtonElement, QuizAnswerButtonProps>(
  ({ state = "default", label = "ა", text, onClick, disabled = false, showLabel = true, className }, ref) => {
    const isLoading = state === "loading";
    const isDisabledState = state === "disabled";
    const styleKey = (isLoading || isDisabledState) ? "default" : state;
    const styles = stateStyles[styleKey];
    const [isPressed, setIsPressed] = React.useState(false);

    const depthHeight = 8;

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        disabled={disabled || isLoading}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ 
          duration: 0.2,
          scale: { type: "spring", stiffness: 400, damping: 17 }
        }}
        className={cn(
          "relative w-full rounded-2xl font-bold text-xl",
          "disabled:cursor-not-allowed",
          isLoading && "cursor-wait",
          isDisabledState && "opacity-40 cursor-not-allowed",
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
            boxShadow: `inset 0 3px 0 rgba(255,255,255,0.35)`,
          }}
        >
          {/* Label Badge or Timer */}
          {showLabel && state !== "next" && (
            <div
              className="flex items-center justify-center w-14 h-10 ml-4 rounded-xl font-bold text-lg"
              style={{
                background: styles.labelBg,
                color: styles.textColor,
              }}
            >
              {isLoading ? (
                <Timer className="w-5 h-5 animate-pulse" />
              ) : (
                <>{label}:</>
              )}
            </div>
          )}
          
          {/* Text or Skeleton */}
          <span
            className={cn(
              "flex-1 px-4",
              state === "next" ? "text-center" : "text-left"
            )}
            style={{ color: styles.textColor }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div 
                  className="h-5 rounded-md animate-pulse"
                  style={{ 
                    width: "60%",
                    background: "rgba(126, 122, 219, 0.3)"
                  }} 
                />
              </div>
            ) : (
              text
            )}
          </span>
        </div>
      </motion.button>
    );
  }
);

QuizAnswerButton.displayName = "QuizAnswerButton";

export { QuizAnswerButton };
