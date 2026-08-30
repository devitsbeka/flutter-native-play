import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGameTypes } from "@/hooks/useGameTypes";
import quickGameIcon from "@/assets/play-modes/quick-game.png";
import playFriendsIcon from "@/assets/play-modes/play-friends.png";
import triviaKingIcon from "@/assets/play-modes/trivia-king.png";
import triviaBattleIcon from "@/assets/play-modes/trivia-battle.png";

// Same soft card treatment as the homepage profile widget (SceneHero)
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

interface PlayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickGame: () => void;
  onPlayWithFriends: () => void;
}

interface PlayOption {
  id: string;
  icon: string;
  tileBg: string;
  tileShadow: string;
  title: string;
  desc: string;
  onClick?: () => void;
  /** Dark-launched mode: rendered as a teaser with a "coming soon" pill. */
  comingSoon?: boolean;
  /** "new"/"beta" pill from the game type registry, shown when live. */
  badge?: string | null;
}

/**
 * Shown when the main play button is pressed: a full-page takeover that blurs
 * everything but the background. Four ways to play — quick match and
 * play-with-friends full width, then Trivia King and Trivia Battle side by
 * side. This replaced the interim /play chooser page: King and Battle read
 * their liveness from the same game type registry that page did, so a mode
 * still dark-launches through the DB's game_types table, just as a card
 * here rather than a screen away.
 */
export function PlayOptionsModal({
  isOpen,
  onClose,
  onQuickGame,
  onPlayWithFriends,
}: PlayOptionsModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const gameTypes = useGameTypes();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const modeOption = (
    key: "king" | "team_battle",
    icon: string,
    tileBg: string,
    tileShadow: string,
    title: string,
  ): PlayOption | null => {
    const gt = gameTypes.find((g) => g.key === key);
    if (!gt) return null; // hidden via the registry
    const comingSoon = gt.status === "coming_soon";
    return {
      id: key,
      icon,
      tileBg,
      tileShadow,
      title,
      desc: t("extra.playCreateRoomInvite"),
      comingSoon,
      badge: gt.badge,
      onClick: comingSoon
        ? undefined
        : () => {
            onClose();
            gt.launch?.(navigate);
          },
    };
  };

  const fullWidthOptions: PlayOption[] = [
    {
      id: "quick",
      icon: quickGameIcon,
      tileBg: "linear-gradient(135deg, #4ADE80 0%, #34D399 45%, #14B8A6 100%)",
      tileShadow: "0 6px 14px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      title: t("extra.playQuickGame"),
      desc: t("extra.playQuickGameDesc"),
      onClick: onQuickGame,
    },
    {
      id: "friends",
      icon: playFriendsIcon,
      tileBg: "linear-gradient(135deg, #F9A8D4 0%, #F472B6 45%, #DB2777 100%)",
      tileShadow: "0 6px 14px rgba(219,39,119,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      title: t("extra.playFriendsGame"),
      desc: t("extra.playFriendsGameDesc"),
      onClick: onPlayWithFriends,
    },
  ];

  const halfWidthOptions = [
    modeOption(
      "king",
      triviaKingIcon,
      "linear-gradient(135deg, #93C5FD 0%, #60A5FA 45%, #4F46E5 100%)",
      "0 6px 14px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      t("extra.playTriviaKing"),
    ),
    modeOption(
      "team_battle",
      triviaBattleIcon,
      "linear-gradient(135deg, #FBBF24 0%, #F59E0B 45%, #F97316 100%)",
      "0 6px 14px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
      t("extra.playTriviaBattle"),
    ),
  ].filter((o): o is PlayOption => o !== null);

  const cardBody = (option: PlayOption, compact: boolean) => (
    <>
      <motion.div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{
          background: option.tileBg,
          boxShadow: option.tileShadow,
          filter: option.comingSoon ? "grayscale(0.55) opacity(0.8)" : undefined,
        }}
        animate={option.comingSoon ? undefined : { rotate: [0, -7, 7, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut", delay: 0.9 }}
      >
        <img src={option.icon} alt="" className="w-10 h-10 object-contain select-none" draggable={false} />
      </motion.div>
      <span className="flex items-center gap-2">
        <p className={`font-bold ${compact ? "text-[15px]" : "text-[17px]"} ${option.comingSoon ? "text-[#402666]/60" : "text-[#402666]"}`}>
          {option.title}
        </p>
        {option.badge && !option.comingSoon && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7C3AED] text-white uppercase">
            {t(option.badge === "new" ? "gameTypes.badgeNew" : "gameTypes.badgeBeta")}
          </span>
        )}
        {option.comingSoon && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#402666]/10 text-[#402666]/60 uppercase">
            {t("gameTypes.comingSoon")}
          </span>
        )}
      </span>
      <p className="text-sm text-[#402666]/60 mt-1">{option.desc}</p>
    </>
  );

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
          className="fixed inset-0 safe-screen z-[100] flex flex-col items-center justify-center gap-7 px-6 bg-white/30 backdrop-blur-[14px] overflow-y-auto"
          onClick={onClose}
        >
          <motion.h2
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="font-display text-2xl md:text-3xl font-bold text-[#402666] text-center max-w-[320px]"
          >
            {t("extra.howToPlayPrompt")}
          </motion.h2>

          <div
            className="w-full max-w-[400px] flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {fullWidthOptions.map((option, i) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 90, scale: 0.6, rotate: i % 2 === 0 ? -8 : 8 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, y: 40, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 360, damping: 16, delay: 0.08 + i * 0.1 }}
                whileHover={{ scale: 1.03, y: -6 }}
                whileTap={{ scale: 0.96 }}
                onClick={option.onClick}
                className="w-full rounded-[24px] p-5 text-left"
                style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
              >
                {cardBody(option, false)}
              </motion.button>
            ))}

            {halfWidthOptions.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {halfWidthOptions.map((option, i) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 90, scale: 0.6, rotate: i % 2 === 0 ? -8 : 8 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, y: 40, scale: 0.85, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 360, damping: 16, delay: 0.28 + i * 0.1 }}
                    whileHover={option.comingSoon ? undefined : { scale: 1.04, y: -6 }}
                    whileTap={option.comingSoon ? undefined : { scale: 0.95 }}
                    onClick={option.onClick}
                    aria-disabled={option.comingSoon}
                    className={`w-full rounded-[24px] p-5 text-left ${option.comingSoon ? "cursor-default" : ""}`}
                    style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
                  >
                    {cardBody(option, true)}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
