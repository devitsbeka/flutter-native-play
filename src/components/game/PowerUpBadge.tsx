import React from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// 3D cube-style power-up icons
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
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

const powerUpAssets: Record<Exclude<PowerUpType, "time-drain"> | "add-power", string> = {
  "fifty-fifty": fiftyFiftyIcon,
  "freeze": freezeIcon,
  "replace": replaceIcon,
  "add-power": addPowerImg,
};

const sizeConfig = {
  xs: 48,
  sm: 72,
  md: 84,
  lg: 108,
  avatar: 72,
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
  const isTimeDrain = type === "time-drain";
  const imageSrc = isTimeDrain ? undefined : powerUpAssets[type as Exclude<PowerUpType, "time-drain"> | "add-power"];
  const iconSize = sizeConfig[size];

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
        style={{ width: iconSize, height: iconSize }}
        className={cn(
          "relative flex items-center justify-center transition-all",
          disabled && "opacity-70 cursor-not-allowed",
          used && "grayscale opacity-50",
          className
        )}
      >
        {/* Just the badge icon - no container */}
        {isTimeDrain ? (
          <div 
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{
              background: disabled || used 
                ? "hsl(var(--muted-foreground))" 
                : "linear-gradient(180deg, #E8B4F8 0%, #C084FC 100%)",
              boxShadow: disabled || used ? "none" : "0 4px 12px rgba(192, 132, 252, 0.4)"
            }}
          >
            <Clock 
              className="text-white" 
              style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
              strokeWidth={2.5} 
            />
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={type}
            className="w-full h-full object-contain"
            style={{
              filter: disabled || used ? "none" : "drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
            }}
          />
        )}
        
        {/* Count badge */}
        {count !== undefined && count > 0 && !used && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 z-20"
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
