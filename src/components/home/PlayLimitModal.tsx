import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownIcon from "@/assets/icons/crown-3d.png";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Lock, Crown, Clock, Play } from "lucide-react";
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

    // Registered non-PRO user - show PRO upgrade modal with regen info
    return (
      <div ref={ref}>
        <GameModal
          isOpen={isOpen}
          onClose={onClose}
          variant="primary"
          iconSrc={crownIcon}
          title="თამაშების ლიმიტი ამოწურულია"
          showSparkles
          showStars
          inline={inline}
          fullScreen={false}
        >
          <div className="space-y-3 mb-4">
            {/* Regen play available - show play now option */}
            {regenPlayAvailable ? (
              <motion.div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)",
                  border: "2px solid rgba(34,197,94,0.4)",
                  boxShadow: "0 3px 0 rgba(34,197,94,0.2)",
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm font-bold text-green-600 mb-1">უფასო თამაში მზადაა!</p>
                <p className="text-xs text-foreground/60">3 საათში 1 თამაში უფასოდ</p>
              </motion.div>
            ) : (
              <>
                {/* Countdown timer */}
                {timeUntilNextPlay && (
                  <motion.div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: "linear-gradient(180deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)",
                      border: "2px solid rgba(59,130,246,0.3)",
                      boxShadow: "0 3px 0 rgba(59,130,246,0.15)",
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-bold text-blue-600">შემდეგი უფასო თამაში: {timeUntilNextPlay}</p>
                    </div>
                    <p className="text-xs text-foreground/60">3 საათში 1 თამაში უფასოდ</p>
                  </motion.div>
                )}

                <motion.p
                  className="text-center text-foreground/80 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  ან გახდი PRO და ითამაშე შეუზღუდავად!
                </motion.p>
              </>
            )}

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
              transition={{ delay: 0.2 }}
            >
              <Crown className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">შეუზღუდავი თამაშები</p>
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
              transition={{ delay: 0.25 }}
            >
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">ექსკლუზიური ფუნქციები</p>
            </motion.div>
          </div>

          {regenPlayAvailable ? (
            <GameModalFooter
              primaryLabel="ითამაშე ახლა"
              onPrimary={onPlayWithRegen}
              primaryIcon={<Play className="w-5 h-5" />}
              secondaryLabel="გახდი PRO"
              onSecondary={handleUpgradeToPro}
            />
          ) : (
            <GameModalFooter
              primaryLabel="გახდი PRO"
              onPrimary={handleUpgradeToPro}
              primaryIcon={<Crown className="w-5 h-5" />}
            />
          )}
        </GameModal>
      </div>
    );
  }
);

PlayLimitModal.displayName = "PlayLimitModal";
