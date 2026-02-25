import { motion } from "framer-motion";
import { Play, Hourglass } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DesktopPlayButtonLargeProps {
  onClick?: () => void;
  playsRemaining?: number;
  maxPlays?: number;
  canPlay?: boolean;
  isVip?: boolean;
  isGuest?: boolean;
  onboardingId?: string;
}

export function DesktopPlayButtonLarge({
  onClick,
  playsRemaining = 5,
  maxPlays = 5,
  canPlay = true,
  isVip = false,
  isGuest = false,
  onboardingId,
}: DesktopPlayButtonLargeProps) {
  const { t } = useLanguage();
  const isExhausted = !canPlay && playsRemaining === 0;
  
  // Get button styling based on state
  const getButtonStyle = () => {
    if (isExhausted) {
      return {
        background: "linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)",
        boxShadow: "0 6px 0 #4B5563, 0 10px 24px rgba(0,0,0,0.25)",
        border: "3px solid #9CA3AF",
      };
    }
    if (isVip) {
      return {
        background: "linear-gradient(180deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)",
        boxShadow: "0 6px 0 #B45309, 0 10px 24px rgba(245, 158, 11, 0.5), inset 0 3px 0 rgba(255,255,255,0.35)",
        border: "3px solid #FBBF24",
      };
    }
    return {
      background: "linear-gradient(180deg, #6EE7B7 0%, #10B981 50%, #059669 100%)",
      boxShadow: "0 6px 0 #047857, 0 10px 24px rgba(16, 185, 129, 0.5), inset 0 3px 0 rgba(255,255,255,0.35)",
      border: "3px solid #34D399",
    };
  };

  const Icon = isExhausted ? Hourglass : Play;

  return (
    <div className="relative">
      {/* Plays remaining badge - hidden for VIP users */}
      {!isExhausted && !isVip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
        >
          <div
            className="px-3 py-1 rounded-full text-sm font-bold text-white whitespace-nowrap"
            style={{
              background: "linear-gradient(180deg, #FBBF24 0%, #D97706 100%)",
              boxShadow: "0 3px 8px rgba(217, 119, 6, 0.3)",
            }}
          >
            {playsRemaining}/{maxPlays}
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={onClick}
        data-onboarding-id={onboardingId}
        className={`
          relative rounded-full flex items-center justify-center gap-3
          h-16 px-12 min-w-[200px]
          transition-all duration-200 cursor-pointer
        `}
        style={getButtonStyle()}
        whileHover={{ scale: 1.03, y: -3 }}
        whileTap={{ scale: 0.97, y: 0 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        {/* Sparkle effects */}
        {!isExhausted && (
          <>
            <motion.div
              className="absolute top-2 left-4 w-1.5 h-1.5 bg-white rounded-full"
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="absolute top-4 right-6 w-2 h-2 bg-white rounded-full"
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute bottom-3 left-8 w-1.5 h-1.5 bg-white/80 rounded-full"
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.7, 1.1, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
            />
          </>
        )}

        {/* Icon */}
        <Icon 
          className="w-7 h-7 text-white drop-shadow-md"
          fill={isExhausted ? "none" : "currentColor"}
          strokeWidth={1.5}
        />

        {/* Text */}
        <span className="text-white font-bold text-xl drop-shadow-md tracking-wide">
          {t("extra.playButton")}
        </span>
      </motion.button>
    </div>
  );
}
