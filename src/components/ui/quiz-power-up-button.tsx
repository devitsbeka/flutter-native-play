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
  label: string;
}> = {
  "5050": { image: power5050, label: "50/50" },
  freeze: { image: powerFreeze, label: "Freeze" },
  replace: { image: powerReplace, label: "Replace" },
  hint: { image: powerHint, label: "Hint" },
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
            "border-2 border-white/70",
            "transition-all duration-200",
            isDisabled ? "opacity-40 cursor-not-allowed grayscale" : "cursor-pointer",
            isLoading ? "bg-gradient-to-b from-[#9E8CD9] to-[#7B6BB7]" : "bg-gradient-to-b from-[#A59ADB] to-[#8B7BC7]"
          )}
          style={{
            boxShadow: isDisabled 
              ? "none" 
              : "0 3px 6px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.3)",
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
                  filter: isDisabled ? "none" : "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
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
              "bg-[#FFF8E7] text-[#7C6BBB]",
              "text-sm font-bold",
              "border-2 border-white/80"
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
