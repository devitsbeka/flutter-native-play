import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Power-up badge images (new hexagonal style)
import power5050Badge from "@/assets/powers/5050-badge.png";
import powerFreezeBadge from "@/assets/powers/freeze-badge.png";
import powerReplaceBadge from "@/assets/powers/replace-badge.png";
import powerTimeDrainBadge from "@/assets/powers/time-drain-badge.png";

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
  "5050": { image: power5050Badge, label: "50/50" },
  freeze: { image: powerFreezeBadge, label: "Freeze" },
  replace: { image: powerReplaceBadge, label: "Replace" },
  hint: { image: powerTimeDrainBadge, label: "Time+" },
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
            <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <motion.img
              src={config.image}
              alt={config.label}
              className="w-12 h-12 object-contain"
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
