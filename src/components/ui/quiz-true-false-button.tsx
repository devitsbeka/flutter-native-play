import * as React from "react";
import { motion, AnimatePresence, type Easing } from "framer-motion";
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
  const isRevealed = state === "correct" || state === "wrong";
  
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
  const easeOut: Easing = "easeOut";

  // Animation variants
  const cardVariants = {
    initial: { 
      scale: 1,
      rotateY: 0,
    },
    tap: { 
      scale: 0.92,
      transition: { duration: 0.1 }
    },
    correct: {
      scale: [1, 1.1, 1],
      rotateY: [0, 10, -10, 0],
      transition: { 
        duration: 0.5,
        times: [0, 0.3, 0.6, 1],
        ease: easeOut
      }
    },
    wrong: {
      scale: [1, 0.95, 1],
      x: [0, -8, 8, -8, 8, 0],
      transition: { 
        duration: 0.4,
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        ease: easeOut
      }
    }
  };

  const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    correct: {
      scale: [1, 1.3, 1],
      rotate: [0, -10, 10, 0],
      transition: { 
        duration: 0.5,
        delay: 0.1,
        ease: easeOut
      }
    },
    wrong: {
      scale: [1, 0.8, 1],
      rotate: [0, -15, 15, 0],
      transition: { 
        duration: 0.4,
        delay: 0.1,
        ease: easeOut
      }
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      variants={cardVariants}
      initial="initial"
      animate={isRevealed ? state : "initial"}
      whileTap={!disabled ? "tap" : undefined}
      className={cn(
        "flex-1 relative h-14 cursor-pointer",
        disabled && "cursor-default",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Shadow/Depth Layer */}
      <motion.div 
        className="absolute inset-0 rounded-2xl"
        style={{ 
          background: styles.depth, 
          transform: "translateY(4px)" 
        }}
        animate={{
          transform: isRevealed ? "translateY(2px)" : "translateY(4px)"
        }}
      />
      
      {/* Main Face */}
      <motion.div 
        className="relative flex flex-row items-center justify-center px-4 rounded-2xl gap-3 h-full overflow-hidden"
        style={{ background: styles.bg }}
        animate={{
          background: styles.bg
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Reveal flash effect */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0.8, scale: 0 }}
              animate={{ opacity: 0, scale: 2.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 rounded-full"
              style={{ 
                background: state === "correct" 
                  ? "radial-gradient(circle, rgba(74,222,128,0.6) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(248,113,113,0.6) 0%, transparent 70%)"
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon Circle */}
        <motion.div 
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
          style={{ background: styles.iconBg }}
          variants={iconVariants}
          initial="initial"
          animate={isRevealed ? state : "initial"}
        >
          {isTrue ? (
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          ) : (
            <X className="w-5 h-5 text-white" strokeWidth={3} />
          )}
        </motion.div>
        
        {/* Label Text */}
        <motion.span 
          className="font-bold text-base"
          style={{ color: styles.text }}
          animate={{
            scale: isRevealed ? [1, 1.1, 1] : 1,
            color: styles.text
          }}
          transition={{ duration: 0.3 }}
        >
          {isTrue ? "მართალია" : "მცდარია"}
        </motion.span>

        {/* Particles for correct answer */}
        <AnimatePresence>
          {state === "correct" && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 1, 
                    scale: 0,
                    x: 0,
                    y: 0
                  }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1,
                    x: (Math.random() - 0.5) * 80,
                    y: (Math.random() - 0.5) * 80
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{ 
                    background: "#22C55E",
                    left: "50%",
                    top: "50%"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}
