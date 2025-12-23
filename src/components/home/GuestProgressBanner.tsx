import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Star, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getGuestProgress, hasGuestProgress } from "@/hooks/useGuestProgress";
import { useAuth } from "@/hooks/useAuth";

export function GuestProgressBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

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

  const handleBannerClick = (e: React.MouseEvent) => {
    // Check if click was on the green button area
    const target = e.target as HTMLElement;
    if (target.closest('[data-save-button]')) {
      navigate("/auth");
      return;
    }
    // Dissolve the banner
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ 
            opacity: 0,
            scale: 0.85,
            filter: "blur(12px)",
            y: 15,
          }}
          transition={{ 
            duration: 0.4, 
            ease: [0.4, 0, 0.2, 1],
          }}
          className="mx-4 mt-1.5 mb-4"
        >
          <motion.button
            onClick={handleBannerClick}
            className="w-full rounded-2xl p-4 shadow-lg overflow-hidden relative"
            style={{ 
              background: "linear-gradient(135deg, hsl(220 50% 25%) 0%, hsl(220 60% 18%) 100%)",
              boxShadow: "0 4px 0 0 hsl(220 60% 12%)" 
            }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Smoke particles on exit */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              exit={{
                opacity: [0, 0.6, 0],
                background: [
                  "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)",
                  "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, transparent 70%)",
                ]
              }}
              transition={{ duration: 0.5 }}
            />
            
            <div className="flex items-center gap-3 relative z-10">
              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-display font-bold text-white text-sm leading-tight mb-1.5">
                  შენი პროგრესი არ არის შენახული!
                </p>
                <p className="text-white/70 text-xs mb-2 truncate">
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
                data-save-button
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
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
