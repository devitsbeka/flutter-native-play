import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

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
  allowZeroClick?: boolean;
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

const POWER_UP_BADGE_GRADIENTS: Record<PowerUpType, string> = {
  "5050": "linear-gradient(180deg, hsl(350 80% 60%) 0%, hsl(330 75% 55%) 100%)",
  freeze: "linear-gradient(180deg, hsl(190 90% 55%) 0%, hsl(210 80% 55%) 100%)",
  replace: "linear-gradient(180deg, hsl(150 75% 50%) 0%, hsl(140 70% 45%) 100%)",
  hint: "linear-gradient(180deg, hsl(270 70% 60%) 0%, hsl(280 65% 55%) 100%)",
};

const QuizPowerUpButton = React.forwardRef<HTMLButtonElement, QuizPowerUpButtonProps>(
  ({ type = "5050", count = 0, state = "default", onClick, className, allowZeroClick = false }, ref) => {
    const config = powerUpConfig[type];
    // allowZeroClick lets a screen offer "earn via ad" when the count is 0
    const isDisabled = state === "disabled" || (count === 0 && !allowZeroClick);
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
            <div className="w-14 h-14 [@media(max-height:700px)]:w-12 [@media(max-height:700px)]:h-12 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <motion.img
              src={config.image}
              alt={config.label}
              className="w-14 h-14 [@media(max-height:700px)]:w-12 [@media(max-height:700px)]:h-12 object-contain"
              style={{
                filter: isDisabled ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,0.3))",
              }}
            />
          )}
        </motion.button>

        {/* Badge: Plus icon for 0, colorful count for > 0 */}
        {!isLoading && (
          <motion.div
            className={cn(
              "absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1 rounded-full",
              "flex items-center justify-center"
            )}
            style={{
              background: count === 0 
                ? "hsl(var(--muted-foreground))" 
                : POWER_UP_BADGE_GRADIENTS[type],
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              border: count > 0 ? "2px solid white" : "none",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
          >
            {count === 0 ? (
              <Plus className="w-3.5 h-3.5 text-white" />
            ) : (
              <span className="text-white text-xs font-bold">{count}</span>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }
);

QuizPowerUpButton.displayName = "QuizPowerUpButton";

export { QuizPowerUpButton, powerUpConfig };
