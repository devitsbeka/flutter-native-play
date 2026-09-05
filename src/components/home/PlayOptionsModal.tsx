import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGameTypes } from "@/hooks/useGameTypes";
import { ScaledCanvas } from "@/components/lobby/LilacLobby";
import bandOne from "@/assets/play-chooser/band-1.webp";
import bandTwo from "@/assets/play-chooser/band-2.webp";
import iconButton from "@/assets/play-chooser/icon-button.png";
import iconHearts from "@/assets/play-chooser/icon-hearts.png";
import iconKing from "@/assets/play-chooser/icon-king.webp";
import iconCrate from "@/assets/play-chooser/icon-crate.png";
import iconBack from "@/assets/play-chooser/icon-back.svg";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const TILE_INNER = "inset 0px 1px 0px 0px rgba(255,255,255,0.4)";

interface PlayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickGame: () => void;
  onPlayWithFriends: () => void;
}

/**
 * The "What do you feel like playing?" takeover, extracted from Figma
 * 950:9956 (board 952:10090): a lilac blur wash over the home page, the
 * TASolivare heading, and the four staggered cards — Quick Game, Play With
 * Friends, New! Versus King, Play Team Battle — at design coordinates
 * inside ScaledCanvas. King and Battle keep their dark-launch state from
 * the game type registry.
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

  const modeOf = (key: "king" | "team_battle") => gameTypes.find((g) => g.key === key);
  const launch = (key: "king" | "team_battle") => {
    const gt = modeOf(key);
    if (!gt || gt.status === "coming_soon") return;
    onClose();
    gt.launch?.(navigate);
  };
  const dark = (key: "king" | "team_battle") => modeOf(key)?.status === "coming_soon";
  // Not offered at all (developer mode off, or hidden by the registry): the
  // card is not drawn. It used to be drawn regardless and simply did
  // nothing when tapped.
  const offered = (key: "king" | "team_battle") => !!modeOf(key);

  // The rotated 56px icon tile every card carries (950:9961 family).
  const tile = (gradient: string, glow: string, rotate: number) => (
    <div
      className="absolute left-[24px] top-[18px] size-[56px] rounded-[20px]"
      style={{
        backgroundImage: gradient,
        transform: `rotate(${rotate}deg)`,
        boxShadow: `${TILE_INNER}, 0px 6px 7px ${glow}`,
      }}
    />
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 safe-screen z-[100] overflow-hidden backdrop-blur-[12px] bg-[rgba(245,217,255,0.7)]"
          onClick={onClose}
        >
          <ScaledCanvas>
            {/* the blurred color band behind the cards (950:10030) */}
            <div
              className="absolute h-[639px] left-[-239px] top-[294px] w-[1136px] opacity-55 pointer-events-none"
              style={{ filter: "blur(37px)" }}
            >
              <img alt="" className="absolute max-w-none object-cover size-full" src={bandOne} />
              <img alt="" className="absolute max-w-none object-cover size-full" src={bandTwo} />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(246,222,255,0) 55.7%, #f6deff 88.4%)",
                }}
              />
            </div>

            {/* header: back only (950:9999) */}
            <div className="absolute left-[17px] top-[21px] w-[466px]">
              <div className="flex items-center justify-between p-[16px]">
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-[9999px] size-[40px] active:scale-95 transition-transform"
                >
                  <img alt="" className="block size-[20px]" src={iconBack} />
                </button>
              </div>
            </div>

            {/* heading (950:9998) */}
            <motion.p
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="absolute left-[52px] top-[134px] w-[400px] not-italic leading-[52px] text-[46px] tracking-[-0.16px] text-[#523b76]"
              style={{ fontFamily: "'TASolivare', sans-serif" }}
            >
              {t("extra.howToPlayPrompt")}
            </motion.p>

            <div onClick={(e) => e.stopPropagation()}>
              {/* Quick Game (950:9969) */}
              <motion.button
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onClose();
                  onQuickGame();
                }}
                className="absolute left-[40px] top-[306px] w-[205px] h-[157px] rounded-[24px] bg-[rgba(252,247,255,0.72)] text-left"
                style={{ boxShadow: CARD_SHADOW }}
              >
                {tile(
                  "linear-gradient(135deg, rgb(74,222,128) 0%, rgb(52,211,153) 45%, rgb(20,184,166) 100%)",
                  "rgba(20,184,166,0.35)",
                  -5.89,
                )}
                <img alt="" className="absolute left-[26px] top-[19px] size-[51px] object-contain" src={iconButton} />
                <p className="absolute left-[25px] top-[107px] max-w-[170px] overflow-hidden text-ellipsis capitalize leading-[34.5px] text-[#402666] text-[20px] tracking-[-0.14px] whitespace-nowrap" style={{ fontFamily: "'Slackey', 'TASolivare', cursive" }}>
                  {t("extra.playQuickGame")}
                </p>
              </motion.button>

              {/* Play With Friends (950:9960) */}
              <motion.button
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.12 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onClose();
                  onPlayWithFriends();
                }}
                className="absolute left-[262px] top-[306px] w-[206px] h-[330px] rounded-[24px] text-left"
                style={{
                  boxShadow: CARD_SHADOW,
                  background:
                    "linear-gradient(to bottom, rgba(255,222,219,0.72) 0%, rgba(225,255,232,0.72) 51.4%, rgba(219,254,252,0.72) 94.7%)",
                }}
              >
                {tile(
                  // The Figma export carried a hard stop (grey 28.9% → magenta
                  // 29.1%) that painted a pale wedge across the badge's corner.
                  // Smooth magenta-to-peach, like every other tile's gradient.
                  "linear-gradient(135deg, rgb(217,60,203) 0%, rgb(228,116,172) 55%, rgb(235,178,140) 100%)",
                  "rgba(211,52,198,0.35)",
                  -5.89,
                )}
                <img alt="" className="absolute left-[20px] top-[14px] size-[64px] object-contain" src={iconHearts} />
                <p className="absolute left-[27px] top-[254px] font-[Nunito] font-bold leading-[25.5px] text-[#402666] text-[17px] tracking-[-0.16px] whitespace-nowrap">
                  {t("lobby.playPrefix")}
                </p>
                <p className="absolute left-[25px] top-[280px] max-w-[170px] overflow-hidden text-ellipsis capitalize leading-[34.5px] text-[#402666] text-[20px] tracking-[-0.14px] whitespace-nowrap" style={{ fontFamily: "'Slackey', 'TASolivare', cursive" }}>
                  {t("lobby.withFriends")}
                </p>
              </motion.button>

              {/* Versus King (950:9978) */}
              {offered("king") && <motion.button
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.19 }}
                whileTap={dark("king") ? undefined : { scale: 0.96 }}
                onClick={() => launch("king")}
                aria-disabled={dark("king")}
                className={`absolute left-[40px] top-[481px] w-[205px] h-[341px] rounded-[24px] bg-[rgba(252,247,255,0.72)] text-left ${dark("king") ? "opacity-70 grayscale-[0.4] cursor-default" : ""}`}
                style={{ boxShadow: CARD_SHADOW }}
              >
                {tile(
                  "linear-gradient(135deg, rgb(167,139,250) 0%, rgb(129,140,248) 45%, rgb(59,130,246) 100%)",
                  "rgba(99,102,241,0.35)",
                  -0.28,
                )}
                <img alt="" className="absolute left-[25px] top-[19px] size-[55px] object-contain" src={iconKing} />
                <p className="absolute left-[27px] top-[262px] font-[Nunito] font-bold leading-[25.5px] opacity-50 text-[#402666] text-[17px] tracking-[-0.16px] whitespace-nowrap">
                  {dark("king") ? t("gameTypes.comingSoon") : t("lobby.newBang")}
                </p>
                <p className="absolute left-[25px] top-[288px] max-w-[170px] overflow-hidden text-ellipsis capitalize leading-[34.5px] text-[#402666] text-[20px] tracking-[-0.14px] whitespace-nowrap" style={{ fontFamily: "'Slackey', 'TASolivare', cursive" }}>
                  {t("lobby.vkTitle")}
                </p>
              </motion.button>}

              {/* Play Team Battle (950:9987) */}
              {offered("team_battle") && <motion.button
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.26 }}
                whileTap={dark("team_battle") ? undefined : { scale: 0.96 }}
                onClick={() => launch("team_battle")}
                aria-disabled={dark("team_battle")}
                className={`absolute left-[263px] top-[652px] w-[205px] h-[165px] rounded-[24px] text-left ${dark("team_battle") ? "opacity-70 grayscale-[0.4] cursor-default" : ""}`}
                style={{
                  boxShadow: CARD_SHADOW,
                  background: "linear-gradient(to bottom, #fff7b8, #f3e9f9)",
                }}
              >
                {tile(
                  "linear-gradient(-51.54deg, rgb(252,28,106) 20.5%, rgb(248,240,129) 42.2%, rgb(246,59,115) 93.6%)",
                  "rgba(246,59,115,0.35)",
                  -0.28,
                )}
                <img alt="" className="absolute left-[28px] top-[26px] w-[49px] h-[44px] object-contain" src={iconCrate} />
                <p className="absolute left-[24px] top-[92px] font-[Nunito] font-bold leading-[25.5px] text-[#402666] text-[17px] tracking-[-0.16px] whitespace-nowrap">
                  {dark("team_battle") ? t("gameTypes.comingSoon") : t("lobby.playPrefix")}
                </p>
                <p className="absolute left-[24px] top-[118px] max-w-[170px] overflow-hidden text-ellipsis capitalize leading-[34.5px] text-[#402666] text-[20px] tracking-[-0.14px] whitespace-nowrap" style={{ fontFamily: "'Slackey', 'TASolivare', cursive" }}>
                  {t("teamBattle.title")}
                </p>
              </motion.button>}
            </div>
          </ScaledCanvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
