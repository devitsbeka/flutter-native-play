import { GameModal } from "@/components/ui/game-modal";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const ICON_BASE = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

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
      icon: `${ICON_BASE}/push-button.png`,
      cardBg: "linear-gradient(135deg, #4ADE80 0%, #34D399 45%, #14B8A6 100%)",
      shadow: "0 8px 20px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      title: t("extra.playQuickGame"),
      desc: t("extra.playQuickGameDesc"),
      onClick: onQuickGame,
    },
    {
      id: "friends",
      icon: `${ICON_BASE}/friends.png`,
      cardBg: "linear-gradient(135deg, #A78BFA 0%, #818CF8 45%, #3B82F6 100%)",
      shadow: "0 8px 20px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
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
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:brightness-105 transition-all text-left"
            style={{ background: option.cardBg, boxShadow: option.shadow }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.22)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
            >
              <img src={option.icon} alt="" className="w-9 h-9 object-contain select-none" draggable={false} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white drop-shadow-sm">{option.title}</p>
              <p className="text-sm text-white/85">{option.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </GameModal>
  );
}
