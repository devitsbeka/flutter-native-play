import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownIcon from "@/assets/icons/crown-3d.png";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Lock, Crown } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface PlayLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister?: () => void;
  isGuest?: boolean;
  inline?: boolean;
  // Regen props for registered non-PRO users
  regenPlayAvailable?: boolean;
  timeUntilNextPlay?: string | null;
  onPlayWithRegen?: () => void;
}

export const PlayLimitModal = React.forwardRef<HTMLDivElement, PlayLimitModalProps>(
  function PlayLimitModal({ isOpen, onClose, onRegister, isGuest = false, inline, regenPlayAvailable, timeUntilNextPlay, onPlayWithRegen }, ref) {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const guestProgress = getGuestProgress();
    
    // Calculate stats for guests
    let totalLevels = 0;
    let totalStars = 0;
    
    Object.values(guestProgress).forEach((cat) => {
      totalLevels += cat.completedLevels.length;
      totalStars += cat.completedLevels.reduce((sum, l) => sum + l.stars_earned, 0);
    });

    const handleUpgradeToPro = () => {
      onClose();
      navigate("/profile?tab=PRO");
    };

    // Guest modal content
    if (isGuest) {
      return (
        <div ref={ref}>
          <GameModal
            isOpen={isOpen}
            onClose={onClose}
            variant="primary"
            iconSrc={triviaBuzzer}
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
                <p className="text-sm font-medium text-foreground">{t("modals.createAnimatedAvatar")}</p>
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
                <p className="text-sm font-medium text-foreground">{t("modals.saveProgress")}</p>
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

    // Registered non-PRO user - show PRO upgrade modal with regen info
    return (
      <div ref={ref}>
        <GameModal
          isOpen={isOpen}
          onClose={onClose}
          variant="primary"
          iconSrc={crownIcon}
          title={t("playLimit.limitReached")}
          showSparkles
          showStars
          inline={inline}
          fullScreen={false}
        >
          {/* PRO upgrade section */}
          <div className="space-y-3 mb-4">
            <motion.p
              className="text-center text-foreground/80 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {t("playLimit.becomeProDescription")}
            </motion.p>

            {/* PRO Benefits */}
            <motion.div 
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)",
                border: "2px solid rgba(245,158,11,0.4)",
                boxShadow: "0 3px 0 rgba(245,158,11,0.2)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Crown className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">{t("playLimit.unlimitedGames")}</p>
            </motion.div>

            <motion.div 
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "linear-gradient(180deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.05) 100%)",
                border: "2px solid rgba(168,85,247,0.3)",
                boxShadow: "0 3px 0 rgba(168,85,247,0.15)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">{t("playLimit.exclusiveFeatures")}</p>
            </motion.div>
          </div>

          {/* PRO button always first */}
          <GameModalFooter
            primaryLabel={t("playLimit.becomePro")}
            onPrimary={handleUpgradeToPro}
            primaryIcon={<Crown className="w-5 h-5" />}
          />

        </GameModal>
      </div>
    );
  }
);

PlayLimitModal.displayName = "PlayLimitModal";
