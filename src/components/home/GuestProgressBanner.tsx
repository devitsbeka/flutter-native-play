import { motion } from "framer-motion";
import { LogIn, Star, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getGuestProgress, hasGuestProgress } from "@/hooks/useGuestProgress";
import { useAuth } from "@/hooks/useAuth";

export function GuestProgressBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Don't show if user is logged in or no guest progress
  if (user || !hasGuestProgress()) return null;

  const guestProgress = getGuestProgress();
  
  // Calculate total levels completed and stars earned
  let totalLevels = 0;
  let totalStars = 0;
  
  Object.values(guestProgress).forEach((cat) => {
    totalLevels += cat.completedLevels.length;
    totalStars += cat.completedLevels.reduce((sum, l) => sum + l.stars_earned, 0);
  });

  if (totalLevels === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <button
        onClick={() => navigate("/auth")}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 shadow-lg overflow-hidden"
        style={{ boxShadow: "0 4px 0 0 hsl(25 80% 35%)" }}
      >
        <div className="flex items-center gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <p className="font-display font-bold text-white text-sm leading-tight mb-0.5">
              შენი პროგრესი არ არის შენახული!
            </p>
            <p className="text-white/80 text-xs mb-2 truncate">
              დარეგისტრირდი რომ არ დაკარგო მიღწევები
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Trophy className="h-3.5 w-3.5 text-white/90 shrink-0" />
                <span className="text-white font-semibold text-xs">
                  {totalLevels} დონე
                </span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <Star className="h-3.5 w-3.5 text-white/90 fill-white/90 shrink-0" />
                <span className="text-white font-semibold text-xs">
                  {totalStars} ვარსკვლავი
                </span>
              </div>
            </div>
          </div>
          
          {/* Circular Save Button */}
          <motion.div 
            className="shrink-0 relative"
            whileTap={{ scale: 0.9, y: 2 }}
          >
            <div 
              className="absolute inset-0 rounded-full"
              style={{ background: "hsl(142 70% 30%)", transform: "translateY(3px)" }}
            />
            <div 
              className="relative rounded-full h-12 w-12 flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, hsl(142 70% 50%) 0%, hsl(142 65% 42%) 100%)" }}
            >
              <LogIn className="h-5 w-5 text-white" />
            </div>
          </motion.div>
        </div>
      </button>
    </motion.div>
  );
}
