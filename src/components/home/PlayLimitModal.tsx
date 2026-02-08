import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import crownIcon from "@/assets/icons/crown-3d.png";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Lock, Crown, Hourglass, Play } from "lucide-react";
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
          title="თამაშის ლიმიტი ამოწურულია"
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
              გახდი PRO და ითამაშე შეუზღუდავად, შექმენი შენი ტრივიები და ბევრი სხვა.
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
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground">ექსკლუზიური ფუნქციები</p>
            </motion.div>
          </div>

          {/* PRO button always first */}
          <GameModalFooter
            primaryLabel="გახდი PRO"
            onPrimary={handleUpgradeToPro}
            primaryIcon={<Crown className="w-5 h-5" />}
          />

          {/* Timer / free play section BELOW the PRO button */}
          {regenPlayAvailable ? (
            <motion.div
              className="mt-4 rounded-xl p-3 text-center"
              style={{
                background: "linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)",
                border: "1.5px solid rgba(34,197,94,0.3)",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs font-bold text-green-600 mb-2">უფასო თამაში მზადაა!</p>
              <button
                onClick={onPlayWithRegen}
                className="flex items-center justify-center gap-2 mx-auto rounded-xl px-5 py-2 text-sm font-bold text-white transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                  boxShadow: "0 3px 0 #059669, 0 4px 12px rgba(16,185,129,0.3)",
                }}
              >
                <Play className="w-4 h-4" />
                ითამაშე ახლა
              </button>
            </motion.div>
          ) : timeUntilNextPlay ? (
            <motion.div
              className="mt-4 rounded-xl p-3 text-center"
              style={{
                background: "linear-gradient(180deg, rgba(107,114,128,0.08) 0%, rgba(107,114,128,0.03) 100%)",
                border: "1.5px solid rgba(107,114,128,0.2)",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Hourglass className="h-4 w-4 text-foreground/50" />
                <p className="text-xs font-semibold text-foreground/70">შემდეგი უფასო თამაში: {timeUntilNextPlay}</p>
              </div>
              <p className="text-[11px] text-foreground/40">3 საათში 1 თამაში უფასოდ</p>
            </motion.div>
          ) : null}
        </GameModal>
      </div>
    );
  }
);

PlayLimitModal.displayName = "PlayLimitModal";
