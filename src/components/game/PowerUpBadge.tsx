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

// Colorful background fills for each power-up type
const fillColors: Record<PowerUpType | "add-power", string> = {
  "fifty-fifty": "#FEF3C7", // Warm amber/gold
  "freeze": "#DBEAFE",      // Light blue
  "replace": "#D1FAE5",     // Light green
  "time-drain": "#FEE2E2",  // Light red/pink
  "add-power": "#EDE9FE",   // Light purple
};

// Colorful ring colors for each power-up
const ringColors: Record<PowerUpType | "add-power", string> = {
  "fifty-fifty": "#F59E0B", // Amber
  "freeze": "#3B82F6",      // Blue
  "replace": "#10B981",     // Green
  "time-drain": "#EF4444",  // Red
  "add-power": "#8B5CF6",   // Purple
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
  const fill = fillColors[type];
  const ringColor = ringColors[type];
  const { outer, inner } = sizeConfig[size];

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
          disabled && "opacity-70 cursor-not-allowed",
          used && "grayscale opacity-50",
          className
        )}
      >
        {/* SVG Ring with colorful border */}
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
            fill={fill}
          />
          {/* Colorful stroke ring */}
          <circle 
            cx={outer / 2} 
            cy={outer / 2} 
            r={(outer / 2) - 3} 
            stroke={ringColor}
            strokeWidth="4"
            fill="none"
            opacity={disabled ? 0.5 : 1}
          />
          {/* Inner white ring for depth */}
          <circle 
            cx={outer / 2} 
            cy={outer / 2} 
            r={(outer / 2) - 5.5} 
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
            fill="none"
          />
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
            className="absolute -top-0.5 -right-0.5 w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center shadow-lg z-20"
            style={{
              background: "linear-gradient(180deg, #FFE4B5 0%, #FFD699 100%)",
              color: "#6B4226",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.5)",
              border: "2px solid rgba(255,255,255,0.8)",
            }}
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