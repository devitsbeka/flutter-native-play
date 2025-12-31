import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, Clock, Replace, Sparkles } from "lucide-react";

export type PowerUpType = "5050" | "freeze" | "replace" | "hint";
export type QuizPowerUpButtonState = "default" | "active" | "disabled" | "loading";

interface QuizPowerUpButtonProps {
  type?: PowerUpType;
  count?: number;
  state?: QuizPowerUpButtonState;
  onClick?: () => void;
  className?: string;
}

const powerUpConfig: Record<PowerUpType, { 
  icon: React.ElementType; 
  glowColor: string;
  label: string;
}> = {
  "5050": { 
    icon: Zap, 
    glowColor: "#FFBE00",
    label: "50/50"
  },
  freeze: { 
    icon: Clock, 
    glowColor: "#F9FBFF",
    label: "Freeze"
  },
  replace: { 
    icon: Replace, 
    glowColor: "#00E2FF",
    label: "Replace"
  },
  hint: { 
    icon: Sparkles, 
    glowColor: "#AD59FF",
    label: "Hint"
  },
};

const QuizPowerUpButton = React.forwardRef<HTMLButtonElement, QuizPowerUpButtonProps>(
  ({ type = "5050", count = 0, state = "default", onClick, className }, ref) => {
    const config = powerUpConfig[type];
    const Icon = config.icon;
    const isDisabled = state === "disabled" || count === 0;
    const isLoading = state === "loading";

    return (
      <motion.div className={cn("relative", className)}>
        <motion.button
          ref={ref}
          onClick={onClick}
          disabled={isDisabled || isLoading}
          className={cn(
            "relative w-16 h-16 rounded-full p-[6px]",
            "border-[0.65px] border-[#605CCB]",
            "transition-all duration-200",
            isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            isLoading ? "bg-muted" : "bg-[#474DAE]"
          )}
          style={{
            boxShadow: isDisabled 
              ? "none" 
              : "0 2.59px 2.59px 0 #6562D2",
          }}
          whileHover={!isDisabled && !isLoading ? { scale: 1.08 } : {}}
          whileTap={!isDisabled && !isLoading ? { scale: 0.95 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {/* Inner container with icon */}
          <div className="w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted-foreground/20 animate-pulse" />
            ) : (
              <motion.div
                className="relative"
                style={{
                  filter: isDisabled ? "none" : `drop-shadow(0 0 8px ${config.glowColor})`,
                }}
                animate={{ rotate: 90 }}
                transition={{ duration: 0 }}
              >
                <Icon 
                  className={cn(
                    "w-10 h-10",
                    isDisabled ? "text-muted-foreground" : "text-white"
                  )} 
                />
              </motion.div>
            )}
          </div>
        </motion.button>

        {/* Count Badge */}
        {!isLoading && (
          <motion.div
            className={cn(
              "absolute -top-1 -right-1 w-7 h-7 rounded-full",
              "flex items-center justify-center",
              "bg-[#FBFBFF] text-[#474DAE]",
              "text-lg font-bold font-['Baloo']"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
          >
            {count}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

QuizPowerUpButton.displayName = "QuizPowerUpButton";

export { QuizPowerUpButton, powerUpConfig };
