import { motion } from "framer-motion";
import { Play, Crown, Hourglass } from "lucide-react";

interface DesktopPlayButtonProps {
  onClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  isCompact?: boolean; // For tablet view (icon only)
  size?: "md" | "lg"; // md = default, lg = 15% larger
}

export function DesktopPlayButton({
  onClick,
  playsRemaining = 5,
  maxPlays = 5,
  canPlay = true,
  isVip = false,
  isCompact = false,
  size = "md",
}: DesktopPlayButtonProps) {
  const isExhausted = !canPlay && playsRemaining === 0;
  
  // Size configurations - lg is 15% larger
  const sizeConfig = {
    md: { height: "h-14", iconSize: "w-6 h-6", textSize: "text-lg", compactHeight: "h-12", compactIcon: "w-5 h-5" },
    lg: { height: "h-16", iconSize: "w-7 h-7", textSize: "text-xl", compactHeight: "h-14", compactIcon: "w-6 h-6" },
  };
  
  const config = sizeConfig[size];
  
  // Get button styling based on state
  const getButtonStyle = () => {
    if (isExhausted) {
      return {
        background: "linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)",
        boxShadow: "0 4px 0 #4B5563, 0 6px 16px rgba(0,0,0,0.2)",
        border: "2px solid #9CA3AF",
      };
    }
    if (isVip) {
      return {
        background: "linear-gradient(180deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)",
        boxShadow: "0 4px 0 #B45309, 0 6px 16px rgba(245, 158, 11, 0.4), inset 0 2px 0 rgba(255,255,255,0.3)",
        border: "2px solid #FBBF24",
      };
    }
    return {
      background: "linear-gradient(180deg, #6EE7B7 0%, #10B981 50%, #059669 100%)",
      boxShadow: "0 4px 0 #047857, 0 6px 16px rgba(16, 185, 129, 0.4), inset 0 2px 0 rgba(255,255,255,0.3)",
      border: "2px solid #34D399",
    };
  };

  const Icon = isExhausted ? Hourglass : (isVip ? Crown : Play);

  return (
    <div className="relative w-full">
      {/* Plays remaining badge */}
      {!isExhausted && !isCompact && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
        >
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap"
            style={{
              background: isVip 
                ? "linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)"
                : "linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {playsRemaining}/{maxPlays}
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={onClick}
        disabled={isExhausted}
        className={`
          relative w-full rounded-xl flex items-center justify-center gap-2
          ${isCompact ? config.compactHeight : config.height} px-4
          transition-all duration-200
          ${isExhausted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
        `}
        style={getButtonStyle()}
        whileHover={!isExhausted ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isExhausted ? { scale: 0.98, y: 0 } : {}}
      >
        {/* Sparkle effects */}
        {!isExhausted && (
          <>
            <motion.div
              className="absolute top-1 left-2 w-1 h-1 bg-white rounded-full"
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="absolute top-3 right-3 w-1.5 h-1.5 bg-white rounded-full"
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute bottom-2 left-4 w-1 h-1 bg-white/80 rounded-full"
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.7, 1.1, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
            />
          </>
        )}

        {/* Icon */}
        <Icon 
          className={`${isCompact ? config.compactIcon : config.iconSize} text-white drop-shadow-md`}
          fill={isExhausted ? "none" : "currentColor"}
          strokeWidth={1.5}
        />

        {/* Text - hidden on compact/tablet */}
        {!isCompact && (
          <span className={`text-white font-bold ${config.textSize} drop-shadow-md tracking-wide`}>
            ითამაშე
          </span>
        )}
      </motion.button>
    </div>
  );
}
