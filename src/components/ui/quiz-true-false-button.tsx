import { memo } from "react";
import * as React from "react";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type QuizTrueFalseState = "default" | "selected" | "correct" | "wrong";

interface QuizTrueFalseButtonProps {
  variant: "true" | "false";
  state?: QuizTrueFalseState;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

function QuizTrueFalseButtonBase({
  variant,
  state = "default",
  onClick,
  disabled,
  className,
}: QuizTrueFalseButtonProps) {
  const { t } = useLanguage();
  const isTrue = variant === "true";
  const isRevealed = state === "correct" || state === "wrong";
  
  // Determine colors based on state and variant
  const getStyles = () => {
    // When answer is revealed
    if (state === "correct") {
      return { 
        bg: "#4ADE80", 
        depth: "#22C55E", 
        iconColor: "#FFFFFF",
        text: "#FFFFFF" 
      };
    }
    if (state === "wrong") {
      return { 
        bg: "#F87171", 
        depth: "#EF4444", 
        iconColor: "#FFFFFF",
        text: "#FFFFFF" 
      };
    }
    
    // Default state - light purple/gray background for both
    return { 
      bg: "#E8E8F4", 
      depth: "#D0D0E0", 
      iconColor: isTrue ? "#22C55E" : "#EF4444",
      text: isTrue ? "#22C55E" : "#EF4444"
    };
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
      scale: 0.95,
      transition: { duration: 0.1 }
    },
    correct: {
      scale: [1, 1.05, 1],
      rotateY: [0, 5, -5, 0],
      transition: { 
        duration: 0.5,
        times: [0, 0.3, 0.6, 1],
        ease: easeOut
      }
    },
    wrong: {
      scale: [1, 0.95, 1],
      x: [0, -6, 6, -6, 6, 0],
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
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, 0],
      transition: { 
        duration: 0.5,
        delay: 0.1,
        ease: easeOut
      }
    },
    wrong: {
      scale: [1, 0.85, 1],
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
        "w-full relative cursor-pointer h-[120px] [@media(max-height:700px)]:h-[100px] [@media(max-height:600px)]:h-[85px]",
        disabled && "cursor-default",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Shadow/Depth Layer */}
      <motion.div 
        className="absolute inset-0 rounded-3xl"
        style={{ 
          background: styles.depth, 
          transform: "translateY(6px)" 
        }}
        animate={{
          transform: isRevealed ? "translateY(3px)" : "translateY(6px)"
        }}
      />
      
      {/* Main Face */}
        <motion.div 
          className="relative flex flex-col items-center justify-center rounded-3xl gap-2 h-full overflow-hidden"
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

        {/* Large Icon (no circle background) */}
        <motion.div 
          className="flex items-center justify-center"
          variants={iconVariants}
          initial="initial"
          animate={isRevealed ? state : "initial"}
        >
          {isTrue ? (
            <Check
              className="w-14 h-14 [@media(max-height:600px)]:w-10 [@media(max-height:600px)]:h-10"
              strokeWidth={3.5} 
              style={{ color: styles.iconColor }}
            />
          ) : (
            <X
              className="w-14 h-14 [@media(max-height:600px)]:w-10 [@media(max-height:600px)]:h-10"
              strokeWidth={3.5} 
              style={{ color: styles.iconColor }}
            />
          )}
        </motion.div>
        
        {/* Label Text */}
        <motion.span 
          className="font-bold text-lg"
          style={{ color: styles.text }}
          animate={{
            scale: isRevealed ? [1, 1.1, 1] : 1,
            color: styles.text
          }}
          transition={{ duration: 0.3 }}
        >
          {isTrue ? t("extra.trueLabel") : t("extra.falseLabel")}
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
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100
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

export const QuizTrueFalseButton = memo(QuizTrueFalseButtonBase);
