import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { t } from "@/lib/i18n";
import type { TriviaKind } from "@/contexts/TriviaCreationContext";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconHouseParty from "@/assets/house-party.png";

/**
 * "It is being made. You can go."
 *
 * The one screen between pressing Create and getting on with your evening.
 * It replaces a progress bar that ran for as long as the AI took and was
 * invented on a timer anyway — nothing in the generate call reports
 * progress, so the bar was a comfort animation that also happened to trap
 * the player in the wizard.
 *
 * It says the trivia is coming, shows what is coming, and gets out of the
 * way: after {@link SHOW_MS} it dismisses itself, and the × dismisses it
 * sooner. Neither cancels anything — the work is already elsewhere (see
 * TriviaCreationContext), and the Create button on the rooms page carries
 * the state from here on.
 */

/** How long it holds before standing down on its own (owner: "2 seconds"). */
export const SHOW_MS = 2000;

/**
 * The same two faces the create menu offers, so the thing being made looks
 * like the thing that was picked.
 */
const ART: Record<TriviaKind, string> = {
  trivia: triviaBuzzer,
  party: iconHouseParty,
};

export function TriviaOnItsWayModal({
  open,
  kind = "trivia",
  onClose,
}: {
  open: boolean;
  kind?: TriviaKind;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, SHOW_MS);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  const art = ART[kind] ?? ART.trivia;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />

          <motion.div
            role="dialog"
            aria-live="polite"
            className="relative w-full max-w-[320px] overflow-hidden rounded-[28px] bg-white px-6 pb-7 pt-9 text-center shadow-[0_24px_60px_rgba(76,29,149,0.28)]"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 transition-colors hover:bg-black/10"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {/* The thing being made, over the ring that says it is working. */}
            <div className="relative mx-auto mb-5 h-[96px] w-[96px]">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border-[3px] border-violet-200 border-t-violet-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
              />
              <span className="absolute inset-[10px] flex items-center justify-center overflow-hidden rounded-full bg-violet-50">
                <img
                  src={art}
                  alt=""
                  className="h-[54px] w-[54px] object-contain"
                  onError={(e) => {
                    // The art is decoration; a missing file must not leave a
                    // torn-page glyph in the middle of the card.
                    (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              </span>
            </div>

            <h2 className="font-[Nunito] text-[20px] font-extrabold leading-[26px] tracking-[-0.2px] text-slate-900">
              {t(kind === "party" ? "extra.partyOnItsWayTitle" : "extra.triviaOnItsWayTitle")}
            </h2>
            <p className="mt-2 font-[Nunito] text-[15px] font-medium leading-[21px] text-slate-500">
              {t("extra.triviaOnItsWayBody")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
