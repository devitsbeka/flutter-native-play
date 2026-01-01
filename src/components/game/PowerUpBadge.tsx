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
  size?: "xs" | "sm" | "md" | "lg" | "avatar";
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

// SVG ring gradients matching design (from -> to colors)
const ringGradients: Record<PowerUpType | "add-power", { from: string; to: string; fill: string }> = {
  "fifty-fifty": { from: "#E85C3A", to: "#FFB347", fill: "#FFF5ED" },
  "freeze": { from: "#1C8CA8", to: "#95EBE9", fill: "#EDF8FF" },
  "replace": { from: "#1CA88C", to: "#95EBD4", fill: "#EDFFF8" },
  "time-drain": { from: "#7B4BBF", to: "#C9A8E9", fill: "#F5EDFF" },
  "add-power": { from: "#5BA81C", to: "#B5EB95", fill: "#F2FFED" },
};

const sizeConfig = {
  xs: { outer: 32, inner: 20 },
  sm: { outer: 48, inner: 30 },
  md: { outer: 69, inner: 45 },
  lg: { outer: 88, inner: 58 },
  avatar: { outer: 56, inner: 36 },
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
  const gradient = ringGradients[type];
  const { outer, inner } = sizeConfig[size];
  const gradientId = `gradient-${type}-${index}`;

  return (
    <motion.div
      // Piano wave idle animation wrapper
      animate={!disabled && !used ? {
        y: [0, -4, 0],
      } : {}}
      transition={{
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.12,
        repeatDelay: 2,
      }}
    >
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
        whileHover={{ scale: 1.1, y: -3 }}
        onClick={onClick}
        disabled={disabled || used}
        style={{ width: outer, height: outer }}
        className={cn(
          "relative flex items-center justify-center transition-all",
          disabled && "grayscale opacity-60 cursor-not-allowed",
          used && "grayscale opacity-50",
          className
        )}
      >
        {/* SVG Ring matching exact design specs */}
        <svg 
          width={outer} 
          height={outer} 
          viewBox={`0 0 ${outer} ${outer}`} 
          fill="none" 
          className="absolute inset-0"
        >
          {/* Background fill circle */}
          <circle 
            cx={outer / 2} 
            cy={outer / 2} 
            r={outer / 2} 
            fill={gradient.fill}
          />
          {/* Gradient stroke ring - 7px at 60% opacity */}
          <circle 
            cx={outer / 2} 
            cy={outer / 2} 
            r={(outer / 2) - 3.5} 
            stroke={`url(#${gradientId})`}
            strokeOpacity="0.6"
            strokeWidth="7"
            fill="none"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
              <stop stopColor={gradient.from} />
              <stop offset="1" stopColor={gradient.to} />
            </linearGradient>
          </defs>
        </svg>
      
      {/* Inner icon */}
      <div 
        className="relative flex items-center justify-center z-10"
        style={{ width: inner, height: inner }}
      >
        <img
          src={imageSrc}
          alt={type}
          className="w-full h-full object-contain drop-shadow-md"
        />
      </div>
      
      {/* Count badge */}
      {count !== undefined && count > 0 && !used && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg z-20"
        >
          {count}
        </motion.span>
      )}
      
      {/* Used overlay */}
      {used && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center z-20"
        >
          <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        </motion.div>
      )}
      </motion.button>
    </motion.div>
  );
}
