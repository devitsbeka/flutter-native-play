import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import powerupBomb from "@/assets/powerup-bomb.png";
import powerupMagic from "@/assets/powerup-magic.png";
import powerupDouble from "@/assets/powerup-double.png";
import powerupSkip from "@/assets/powerup-skip.png";

export type PowerUpType = "double" | "bomb" | "skip" | "magic";

interface PowerUpIconProps {
  type: PowerUpType;
  isLocked?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  label?: string;
}

const powerUpImages: Record<PowerUpType, string> = {
  double: powerupDouble,
  bomb: powerupBomb,
  skip: powerupSkip,
  magic: powerupMagic,
};

const powerUpLabels: Record<PowerUpType, string> = {
  double: "Double\nchance",
  bomb: "Bomb",
  skip: "Skip",
  magic: "Magic\nAnswer",
};

export function PowerUpIcon({ 
  type, 
  isLocked = true, 
  isActive = false,
  onClick,
  label
}: PowerUpIconProps) {
  const displayLabel = label || powerUpLabels[type];
  
  return (
    <motion.button
      onClick={onClick}
      disabled={isLocked}
      className="flex flex-col items-center gap-1"
      whileHover={!isLocked ? { scale: 1.1 } : {}}
      whileTap={!isLocked ? { scale: 0.95 } : {}}
    >
      <div className="relative">
        {/* Icon container */}
        <div 
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden ${
            isLocked ? "grayscale opacity-70" : ""
          } ${isActive ? "ring-2 ring-accent ring-offset-2" : ""}`}
          style={{
            background: isLocked 
              ? "linear-gradient(180deg, hsl(0 0% 70%) 0%, hsl(0 0% 55%) 100%)"
              : "linear-gradient(180deg, hsl(0 0% 95%) 0%, hsl(0 0% 88%) 100%)",
            boxShadow: isLocked
              ? "0 4px 0 hsl(0 0% 45%), inset 0 1px 0 hsl(0 0% 80%)"
              : "0 4px 0 hsl(0 0% 75%), inset 0 1px 0 hsl(0 0% 100%)"
          }}
        >
          <img 
            src={powerUpImages[type]} 
            alt={type}
            className={`w-10 h-10 object-contain ${isLocked ? "opacity-60" : ""}`}
          />
        </div>
        
        {/* Lock badge */}
        {isLocked && (
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: "linear-gradient(180deg, hsl(45 95% 55%) 0%, hsl(35 90% 45%) 100%)",
              boxShadow: "0 2px 0 hsl(35 80% 35%)"
            }}
          >
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
      
      {/* Label */}
      <span className="text-xs font-semibold text-center text-primary whitespace-pre-line leading-tight">
        {displayLabel}
      </span>
    </motion.button>
  );
}
