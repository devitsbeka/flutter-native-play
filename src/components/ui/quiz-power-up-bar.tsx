import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuizPowerUpButton, PowerUpType, QuizPowerUpButtonState } from "./quiz-power-up-button";

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
}

const defaultPowerUps: PowerUp[] = [
  { type: "5050", count: 2 },
  { type: "freeze", count: 1 },
  { type: "replace", count: 3 },
  { type: "hint", count: 4 },
];

const QuizPowerUpBar = React.forwardRef<HTMLDivElement, QuizPowerUpBarProps>(
  ({ powerUps = defaultPowerUps, onPowerUpClick, className, allowZeroClick }, ref) => {
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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: index * 0.1,
            }}
          >
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
