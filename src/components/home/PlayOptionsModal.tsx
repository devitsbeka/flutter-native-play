import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const ICON_BASE = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

// Same soft card treatment as the homepage profile widget (SceneHero)
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

interface PlayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickGame: () => void;
  onPlayWithFriends: () => void;
}

/**
 * Shown when the main play button is pressed: a full-page takeover that blurs
 * everything but the background, then springs two side-by-side option cards
 * in — quick match (random opponent + category) vs play with friends.
 */
export function PlayOptionsModal({
  isOpen,
  onClose,
  onQuickGame,
  onPlayWithFriends,
}: PlayOptionsModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const options = [
    {
      id: "quick",
      icon: `${ICON_BASE}/push-button.png`,
      tileBg: "linear-gradient(135deg, #4ADE80 0%, #34D399 45%, #14B8A6 100%)",
      tileShadow: "0 6px 14px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      title: t("extra.playQuickGame"),
      desc: t("extra.playQuickGameDesc"),
      onClick: onQuickGame,
    },
    {
      id: "friends",
      icon: `${ICON_BASE}/friends.png`,
      tileBg: "linear-gradient(135deg, #A78BFA 0%, #818CF8 45%, #3B82F6 100%)",
      tileShadow: "0 6px 14px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      title: t("extra.playFriendsGame"),
      desc: t("extra.playFriendsGameDesc"),
      onClick: onPlayWithFriends,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          // The page still shows through, but blurred/washed enough that the
          // purple title stays readable over busy scene artwork
          className="fixed inset-0 safe-screen z-[100] flex flex-col items-center justify-center gap-8 px-6 bg-white/30 backdrop-blur-[14px]"
          onClick={onClose}
        >
          <motion.h2
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="font-display text-2xl md:text-3xl font-bold text-[#402666] text-center"
          >
            {t("extra.howToPlayPrompt")}
          </motion.h2>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6" onClick={(e) => e.stopPropagation()}>
            {options.map((option, i) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 90, scale: 0.6, rotate: i === 0 ? -8 : 8 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, y: 40, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 360, damping: 16, delay: 0.08 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -8, rotate: i === 0 ? -1.5 : 1.5 }}
                whileTap={{ scale: 0.95 }}
                onClick={option.onClick}
                className="w-[300px] max-w-[80vw] rounded-[24px] p-6 text-left"
                style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: option.tileBg, boxShadow: option.tileShadow }}
                  animate={{ rotate: [0, -7, 7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut", delay: 0.7 + i * 0.35 }}
                >
                  <img src={option.icon} alt="" className="w-9 h-9 object-contain select-none" draggable={false} />
                </motion.div>
                <p className="font-bold text-[17px] text-[#402666]">{option.title}</p>
                <p className="text-sm text-[#402666]/60 mt-1">{option.desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
