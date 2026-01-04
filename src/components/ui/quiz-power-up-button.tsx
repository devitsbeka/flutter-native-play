import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// 3D cube-style power-up icons
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";

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
  hint: { image: powerTimeDrain, label: "Time+" },
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
            "relative flex items-center justify-center",
            isDisabled ? "opacity-40 cursor-not-allowed grayscale" : "cursor-pointer",
          )}
          whileHover={!isDisabled && !isLoading ? { scale: 1.15, y: -3 } : {}}
          whileTap={!isDisabled && !isLoading ? { scale: 0.9 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          {/* Just the icon - no container */}
          {isLoading ? (
            <div className="w-16 h-16 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <motion.img
              src={config.image}
              alt={config.label}
              className="w-16 h-16 object-contain"
              style={{
                filter: isDisabled ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,0.3))",
              }}
            />
          )}
        </motion.button>

        {/* Small count badge with × */}
        {!isLoading && (
          <motion.div
            className={cn(
              "absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full",
              "flex items-center justify-center",
              "bg-black/70 text-white",
              "text-[10px] font-bold",
              "border border-white/30"
            )}
            style={{
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
          >
            ×{count}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

QuizPowerUpButton.displayName = "QuizPowerUpButton";

export { QuizPowerUpButton, powerUpConfig };
