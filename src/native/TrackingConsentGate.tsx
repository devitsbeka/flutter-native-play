import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { subscribeToPrePrompt, answerPrePrompt } from "@/native/trackingConsent";
// The standalone translator rather than useLanguage: this gate is mounted at
// the router root, above LanguageProvider, so the hook would have no context
// to read. Copy still follows the saved language preference.
import { t } from "@/utils/standaloneTranslation";

/**
 * The screen that appears before iOS asks about tracking.
 *
 * Apple allows a pre-prompt and reviewers expect one; what they reject is a
 * pre-prompt that misrepresents the choice or makes the app look broken if
 * you decline. So this states the trade honestly — ads either way, relevant
 * or random — and "Not now" is a real answer that leaves the system prompt
 * unasked rather than a button that nags.
 *
 * Rendered once at the app root. Invisible until something calls
 * `ensureTrackingConsent()`.
 */
export function TrackingConsentGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToPrePrompt(setOpen), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="att-title"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="w-full max-w-[420px] rounded-[28px] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
              <Shield className="h-8 w-8 text-violet-600" />
            </div>

            <h2
              id="att-title"
              className="text-center font-display text-2xl font-bold text-[#2A1A3E]"
            >
              {t("att.title")}
            </h2>

            <p className="mt-3 text-center text-[15px] leading-relaxed text-[#402666]/75">
              {t("att.body")}
            </p>

            <p className="mt-3 text-center text-[13px] leading-relaxed text-[#402666]/55">
              {t("att.reassurance")}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => answerPrePrompt(true)}
                className="h-[52px] w-full rounded-[18px] bg-violet-600 text-[17px] font-bold text-white active:scale-[0.98]"
              >
                {t("att.continue")}
              </button>
              <button
                onClick={() => answerPrePrompt(false)}
                className="h-[52px] w-full rounded-[18px] text-[16px] font-semibold text-[#402666]/60 active:scale-[0.98]"
              >
                {t("att.notNow")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
