import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  QuizPowerUpButton,
  PowerUpType,
  QuizPowerUpButtonState,
  POWER_UP_BADGE_GRADIENTS,
} from "./quiz-power-up-button";

interface PowerUp {
  type: PowerUpType;
  count: number;
  state?: QuizPowerUpButtonState;
}

interface QuizPowerUpBarProps {
  powerUps?: PowerUp[];
  onPowerUpClick?: (type: PowerUpType) => void;
  className?: string;
  allowZeroClick?: boolean;
  /** Status pills floated directly above a specific power button — e.g.
      "დრო გაყინულია · 8წ" over the freeze cube while the timer is frozen.
      Anchored here, not at the top of the screen, so the label never covers
      the question or the difficulty pill. */
  badges?: Partial<Record<PowerUpType, string>>;
}

const defaultPowerUps: PowerUp[] = [
  { type: "5050", count: 2 },
  { type: "freeze", count: 1 },
  { type: "replace", count: 3 },
  { type: "hint", count: 4 },
];

const QuizPowerUpBar = React.forwardRef<HTMLDivElement, QuizPowerUpBarProps>(
  ({ powerUps = defaultPowerUps, onPowerUpClick, className, allowZeroClick, badges }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-6",
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25,
          staggerChildren: 0.1
        }}
      >
        {powerUps.map((powerUp, index) => (
          <motion.div
            key={powerUp.type}
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: index * 0.1,
            }}
          >
            <AnimatePresence>
              {badges?.[powerUp.type] && (
                <motion.div
                  // x stays in the motion values — a -translate-x-1/2 class
                  // would be overwritten the moment framer animates transform.
                  initial={{ opacity: 0, y: 8, scale: 0.85, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                  exit={{ opacity: 0, y: 8, scale: 0.85, x: "-50%" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute bottom-full left-1/2 mb-2 z-20 pointer-events-none whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg"
                  style={{ background: POWER_UP_BADGE_GRADIENTS[powerUp.type] }}
                >
                  {badges[powerUp.type]}
                </motion.div>
              )}
            </AnimatePresence>
            <QuizPowerUpButton
              type={powerUp.type}
              count={powerUp.count}
              state={powerUp.state}
              allowZeroClick={allowZeroClick}
              onClick={() => onPowerUpClick?.(powerUp.type)}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  }
);

QuizPowerUpBar.displayName = "QuizPowerUpBar";

export { QuizPowerUpBar };
