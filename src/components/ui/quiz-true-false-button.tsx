import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export type QuizTrueFalseState = "default" | "selected" | "correct" | "wrong";

interface QuizTrueFalseButtonProps {
  variant: "true" | "false";
  state?: QuizTrueFalseState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function QuizTrueFalseButton({
  variant,
  state = "default",
  onClick,
  disabled,
  className,
}: QuizTrueFalseButtonProps) {
  const isTrue = variant === "true";
  
  // Determine colors based on state and variant
  const getStyles = () => {
    // When answer is revealed
    if (state === "correct") {
      return { 
        bg: "#4ADE80", 
        depth: "#22C55E", 
        iconBg: "#22C55E",
        text: "#FFFFFF" 
      };
    }
    if (state === "wrong") {
      return { 
        bg: "#F87171", 
        depth: "#EF4444", 
        iconBg: "#EF4444",
        text: "#FFFFFF" 
      };
    }
    
    // Default state - green theme for true, red theme for false
    if (isTrue) {
      return { 
        bg: "#E8F5E9", 
        depth: "#A5D6A7", 
        iconBg: "#22C55E",
        text: "#22C55E" 
      };
    } else {
      return { 
        bg: "#FFEBEE", 
        depth: "#EF9A9A", 
        iconBg: "#EF4444",
        text: "#EF4444" 
      };
    }
  };

  const styles = getStyles();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      className={cn(
        "flex-1 relative min-h-[120px] cursor-pointer",
        disabled && "cursor-default",
        className
      )}
    >
      {/* Shadow/Depth Layer */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{ 
          background: styles.depth, 
          transform: "translateY(4px)" 
        }}
      />
      
      {/* Main Face */}
      <div 
        className="relative flex flex-col items-center justify-center py-5 rounded-2xl gap-2 h-full"
        style={{ background: styles.bg }}
      >
        {/* Icon Circle */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: styles.iconBg }}
        >
          {isTrue ? (
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          ) : (
            <X className="w-8 h-8 text-white" strokeWidth={3} />
          )}
        </div>
        
        {/* Label Text */}
        <span 
          className="font-bold text-lg"
          style={{ color: styles.text }}
        >
          {isTrue ? "მართალია" : "მცდარია"}
        </span>
      </div>
    </motion.button>
  );
}
