import { motion } from "framer-motion";
import { AlertTriangle, LogIn, Star, Trophy } from "lucide-react";
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
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 shadow-lg"
        style={{ boxShadow: "0 4px 0 0 hsl(25 80% 35%)" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1 text-left">
            <p className="font-bold text-white text-sm mb-1">
              შენი პროგრესი არ არის შენახული!
            </p>
            <p className="text-white/80 text-xs mb-2">
              დარეგისტრირდი რომ არ დაკარგო შენი მიღწევები
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-white/90" />
                <span className="text-white font-semibold text-sm">
                  {totalLevels} დონე
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-white/90 fill-white/90" />
                <span className="text-white font-semibold text-sm">
                  {totalStars} ვარსკვლავი
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5">
            <LogIn className="h-4 w-4 text-white" />
            <span className="text-white font-semibold text-xs">შენახვა</span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
