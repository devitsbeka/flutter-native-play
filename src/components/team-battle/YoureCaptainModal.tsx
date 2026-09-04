import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import crownIcon from "@/assets/lobby/crown.png";

/** How long the crown stays up before it takes itself away. */
export const CAPTAIN_CROWN_MS = 1500;

/**
 * "You're captain!" — a second and a half, then gone.
 *
 * The armband used to arrive silently: the vote closed, a crown appeared on
 * one row of a list, and the person wearing it found out by noticing. It is
 * the one role in the arena that changes what you do — you pick the first
 * category, and you play the decider if the match ties — so it is worth being
 * told, once, in the middle of the screen.
 *
 * It closes itself. A dialog that waits for a tap would sit over the lobby
 * while the room is trying to start, and the news is one word long.
 */
export function YoureCaptainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, CAPTAIN_CROWN_MS);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center px-7 backdrop-blur-[10px] bg-[rgba(245,217,255,0.6)]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className="flex w-full max-w-[300px] flex-col items-center gap-2 rounded-[24px] bg-white px-6 py-7 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.img
          src={crownIcon}
          alt=""
          initial={{ scale: 0.3, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 14 }}
          className="h-[56px] w-[56px] object-contain"
          aria-hidden
        />
        <p
          className="text-center text-[21px] text-[#523b76]"
          style={{ fontFamily: "'TASolivare', sans-serif" }}
        >
          {t("lobby.youAreCaptain")}
        </p>
      </motion.div>
    </div>
  );
}
