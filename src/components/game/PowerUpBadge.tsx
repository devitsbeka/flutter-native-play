import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Power-up assets
import fiftyFiftyImg from "@/assets/powers/5050.png";
import freezeImg from "@/assets/powers/freeze.png";
import replaceImg from "@/assets/powers/replace.png";
import timeDrainImg from "@/assets/powers/time-drain.png";
import addPowerImg from "@/assets/powers/add-power.png";

export type PowerUpType = "fifty-fifty" | "freeze" | "replace" | "time-drain";

interface PowerUpBadgeProps {
  type: PowerUpType | "add-power";
  size?: "sm" | "md" | "lg";
  index?: number;
  disabled?: boolean;
  used?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

const powerUpAssets: Record<PowerUpType | "add-power", string> = {
  "fifty-fifty": fiftyFiftyImg,
  "freeze": freezeImg,
  "replace": replaceImg,
  "time-drain": timeDrainImg,
  "add-power": addPowerImg,
};

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-18 h-18",
};

export function PowerUpBadge({
  type,
  size = "md",
  index = 0,
  disabled = false,
  used = false,
  count,
  onClick,
  className,
}: PowerUpBadgeProps) {
  const imageSrc = powerUpAssets[type];

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, rotate: -15 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 20,
        delay: index * 0.06,
      }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.1 }}
      onClick={onClick}
      disabled={disabled || used}
      className={cn(
        "relative flex items-center justify-center transition-all",
        sizeClasses[size],
        disabled && "opacity-40 cursor-not-allowed",
        used && "grayscale opacity-50",
        className
      )}
    >
      <img
        src={imageSrc}
        alt={type}
        className="w-full h-full object-contain drop-shadow-lg"
      />
      
      {/* Count badge */}
      {count !== undefined && count > 1 && !used && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
        >
          {count}
        </motion.span>
      )}
      
      {/* Used overlay */}
      {used && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
