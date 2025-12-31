import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Power-up images
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerHint from "@/assets/powers/time-drain.png";

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
  image: string; 
  glowColor: string;
  label: string;
}> = {
  "5050": { 
    image: power5050, 
    glowColor: "#FFBE00",
    label: "50/50"
  },
  freeze: { 
    image: powerFreeze, 
    glowColor: "#00BFFF",
    label: "Freeze"
  },
  replace: { 
    image: powerReplace, 
    glowColor: "#00E2FF",
    label: "Replace"
  },
  hint: { 
    image: powerHint, 
    glowColor: "#AD59FF",
    label: "Hint"
  },
};

const QuizPowerUpButton = React.forwardRef<HTMLButtonElement, QuizPowerUpButtonProps>(
  ({ type = "5050", count = 0, state = "default", onClick, className }, ref) => {
    const config = powerUpConfig[type];
    const isDisabled = state === "disabled" || count === 0;
    const isLoading = state === "loading";

    return (
      <motion.div className={cn("relative", className)}>
        <motion.button
          ref={ref}
          onClick={onClick}
          disabled={isDisabled || isLoading}
          className={cn(
            "relative w-14 h-14 rounded-full p-1",
            "border-2 border-[#605CCB]",
            "transition-all duration-200",
            isDisabled ? "opacity-40 cursor-not-allowed grayscale" : "cursor-pointer",
            isLoading ? "bg-[#5A58A8]" : "bg-[#474DAE]"
          )}
          style={{
            boxShadow: isDisabled 
              ? "none" 
              : `0 3px 0 #3D3A8C, 0 0 ${state === "active" ? "15px" : "8px"} ${config.glowColor}40`,
          }}
          whileHover={!isDisabled && !isLoading ? { scale: 1.1, y: -2 } : {}}
          whileTap={!isDisabled && !isLoading ? { scale: 0.95, y: 2 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {/* Inner container with image */}
          <div className="w-full h-full flex items-center justify-center rounded-full overflow-hidden">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
            ) : (
              <motion.img
                src={config.image}
                alt={config.label}
                className="w-10 h-10 object-contain"
                style={{
                  filter: isDisabled ? "none" : `drop-shadow(0 0 6px ${config.glowColor})`,
                }}
              />
            )}
          </div>
        </motion.button>

        {/* Count Badge */}
        {!isLoading && (
          <motion.div
            className={cn(
              "absolute -top-1 -right-1 w-6 h-6 rounded-full",
              "flex items-center justify-center",
              "bg-white text-[#474DAE]",
              "text-sm font-bold",
              "border-2 border-[#474DAE]"
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
