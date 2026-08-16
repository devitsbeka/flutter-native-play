import { memo } from "react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export type QuizAnswerState = "default" | "selected" | "correct" | "wrong" | "next" | "loading" | "disabled";

interface QuizAnswerButtonProps {
  state?: QuizAnswerState;
  label?: string;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
  /** TV screens are viewed from across the room - roughly doubles text size */
  largeText?: boolean;
}

const stateStyles: Record<Exclude<QuizAnswerState, "loading" | "disabled">, {
  faceBg: string;
  depthColor: string;
  textColor: string;
  labelBg: string;
  labelText: string;
}> = {
  default: {
    faceBg: "#FFFFFF",
    depthColor: "#CBD5E1",
    textColor: "#2A2550",
    labelBg: "#7DD3FC",
    labelText: "#FFFFFF",
  },
  selected: {
    faceBg: "#7DD3FC",
    depthColor: "#38BDF8",
    textColor: "#FFFFFF",
    labelBg: "#FFFFFF",
    labelText: "#7DD3FC",
  },
  correct: {
    faceBg: "#4ADE80",
    depthColor: "#22C55E",
    textColor: "#FFFFFF",
    labelBg: "#FFFFFF",
    labelText: "#22C55E",
  },
  wrong: {
    faceBg: "#EF4444",
    depthColor: "#DC2626",
    textColor: "#FFFFFF",
    labelBg: "#FFFFFF",
    labelText: "#EF4444",
  },
  next: {
    faceBg: "#4ADE80",
    depthColor: "#22C55E",
    textColor: "#FFFFFF",
    labelBg: "#FFFFFF",
    labelText: "#22C55E",
  },
};

const QuizAnswerButton = React.forwardRef<HTMLButtonElement, QuizAnswerButtonProps>(
  ({ state = "default", label = "A", text, onClick, disabled = false, showLabel = true, className, largeText = false }, ref) => {
    const isLoading = state === "loading";
    const isDisabledState = state === "disabled";
    const styleKey = (isLoading || isDisabledState) ? "default" : state;
    const styles = stateStyles[styleKey];
    const [isPressed, setIsPressed] = React.useState(false);

    const depthHeight = 4;

    // Show icon instead of letter for correct/wrong states
    const showIcon = state === "correct" || state === "wrong";

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
        animate={{ opacity: 1 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        className={cn(
          "relative w-full h-full rounded-2xl font-bold text-lg",
          "disabled:cursor-not-allowed",
          isLoading && "cursor-wait",
          isDisabledState && "opacity-40 cursor-not-allowed",
          className
        )}
        style={{
          paddingBottom: depthHeight,
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
            className="relative flex items-center h-full min-h-[60px] [@media(max-height:700px)]:min-h-[52px] [@media(max-height:600px)]:min-h-[48px] py-2.5 [@media(max-height:700px)]:py-2 [@media(max-height:600px)]:py-1.5 rounded-2xl transition-transform duration-100"
            style={{
              background: styles.faceBg,
              transform: `translateY(${isPressed ? 2 : 0}px)`,
              boxShadow: `inset 0 2px 0 rgba(255,255,255,0.4)`,
            }}
          >
            {/* Label Badge */}
            {showLabel && state !== "next" && (
              <div
                className="flex items-center justify-center w-9 h-9 ml-3 rounded-xl font-bold text-base"
                style={{
                  background: styles.labelBg,
                  color: styles.labelText,
                }}
              >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : showIcon ? (
                state === "correct" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
              ) : (
                label
              )}
            </div>
          )}
          
          {/* Text */}
          <span
            className={cn(
              "flex-1 px-3 break-words line-clamp-2",
              state === "next" ? "text-center" : "text-left",
              largeText
                ? (text.length > 30 ? "text-[14px]" : "text-[18px]")
                : (text.length > 30 ? "text-sm" : "text-base")
            )}
            style={{ 
              color: styles.textColor,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
              lineHeight: '1.3',
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div 
                  className="h-4 rounded-md animate-pulse"
                  style={{ 
                    width: "60%",
                    background: "rgba(0, 0, 0, 0.1)"
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

const QuizAnswerButtonMemo = memo(QuizAnswerButton);
export { QuizAnswerButtonMemo as QuizAnswerButton };
