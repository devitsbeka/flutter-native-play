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

// Ring colors matching the design
const ringColors: Record<PowerUpType | "add-power", string> = {
  "fifty-fifty": "rgba(255, 150, 100, 0.6)",
  "freeze": "rgba(130, 200, 255, 0.6)",
  "replace": "rgba(100, 220, 200, 0.6)",
  "time-drain": "rgba(180, 140, 220, 0.6)",
  "add-power": "rgba(140, 220, 100, 0.6)",
};

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-18 h-18",
  lg: "w-24 h-24",
};

const ringSize = {
  sm: "w-[72px] h-[72px]",
  md: "w-20 h-20",
  lg: "w-28 h-28",
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
        ringSize[size],
        disabled && "opacity-40 cursor-not-allowed",
        used && "grayscale opacity-50",
        className
      )}
    >
      {/* Circular ring background */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${ringColors[type]}, transparent 60%)`,
          border: `3px solid ${ringColors[type]}`,
        }}
      />
      
      {/* Inner icon */}
      <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
        <img
          src={imageSrc}
          alt={type}
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </div>
      
      {/* Count badge */}
      {count !== undefined && count > 0 && !used && (
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
