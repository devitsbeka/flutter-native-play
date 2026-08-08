import { GameModal } from "@/components/ui/game-modal";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface PlayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickGame: () => void;
  onPlayWithFriends: () => void;
}

/**
 * Shown when the main play button is pressed: the player chooses between an
 * instant quick match (random opponent + random category) and playing with
 * friends (goes to the new-room screen).
 */
export function PlayOptionsModal({
  isOpen,
  onClose,
  onQuickGame,
  onPlayWithFriends,
}: PlayOptionsModalProps) {
  const { t } = useLanguage();

  const options = [
    {
      id: "quick",
      emoji: "⚡",
      tileBg: "linear-gradient(180deg, #6EE7B7 0%, #34D399 100%)",
      title: t("extra.playQuickGame"),
      desc: t("extra.playQuickGameDesc"),
      onClick: onQuickGame,
    },
    {
      id: "friends",
      emoji: "👥",
      tileBg: "linear-gradient(180deg, #C4B5FD 0%, #A78BFA 100%)",
      title: t("extra.playFriendsGame"),
      desc: t("extra.playFriendsGameDesc"),
      onClick: onPlayWithFriends,
    },
  ];

  return (
    <GameModal isOpen={isOpen} onClose={onClose} title={t("extra.howToPlayPrompt")}>
      <div className="space-y-3 pt-1 pb-2">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={option.onClick}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/40 hover:bg-muted transition-colors text-left"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: option.tileBg, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)" }}
            >
              {option.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">{option.title}</p>
              <p className="text-sm text-muted-foreground">{option.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </GameModal>
  );
}
