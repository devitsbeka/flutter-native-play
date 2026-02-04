import React from "react";
import { motion } from "framer-motion";
import { Star, Trophy, Sparkles, Lock } from "lucide-react";
import { GameModal, GameModalFooter, GameModalStat } from "@/components/ui/game-modal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useLanguage } from "@/contexts/LanguageContext";

interface GuestMaxPlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  inline?: boolean;
}

export const GuestMaxPlaysModal = React.forwardRef<HTMLDivElement, GuestMaxPlaysModalProps>(
  function GuestMaxPlaysModal({ isOpen, onClose, onRegister, inline }, ref) {
    const { t } = useLanguage();
    const guestProgress = getGuestProgress();
    
    // Calculate stats
    let totalLevels = 0;
    let totalStars = 0;
    
    Object.values(guestProgress).forEach((cat) => {
      totalLevels += cat.completedLevels.length;
      totalStars += cat.completedLevels.reduce((sum, l) => sum + l.stars_earned, 0);
    });

    return (
      <div ref={ref}>
        <GameModal
          isOpen={isOpen}
          onClose={onClose}
          variant="primary"
          iconEmoji="🎮"
          title={t("modals.likedIt")}
          showSparkles
          showStars
          inline={inline}
          fullScreen={false}
        >
          {/* Benefits list */}
          <div className="space-y-2 mb-4">
            <motion.div 
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.05) 100%)",
                border: "2px solid rgba(168,85,247,0.3)",
                boxShadow: "0 3px 0 rgba(168,85,247,0.15)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">{t("modals.createAnimatedAvatar") || "შექმენი ანიმირებული ავატარი"}</p>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)",
                border: "2px solid rgba(34,197,94,0.3)",
                boxShadow: "0 3px 0 rgba(34,197,94,0.15)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Trophy className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-foreground">{t("modals.saveProgress") || "შეინახე პროგრესი"}</p>
            </motion.div>

            <motion.div 
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
                border: "2px solid rgba(59,130,246,0.3)",
                boxShadow: "0 3px 0 rgba(59,130,246,0.15)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Lock className="h-5 w-5 text-blue-600 shrink-0" />
              <p className="text-sm font-medium text-foreground">{t("modals.unlockAllFeatures")}</p>
            </motion.div>
          </div>

          <GameModalFooter
            primaryLabel={t("common.letsGo")}
            onPrimary={onRegister}
            primaryIcon={<Sparkles className="w-5 h-5" />}
          />
        </GameModal>
      </div>
    );
  }
);

GuestMaxPlaysModal.displayName = "GuestMaxPlaysModal";