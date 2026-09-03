import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles, Gift, Lock } from "lucide-react";
import { subscribeToPrePrompt, acknowledgePrePrompt } from "@/native/trackingConsent";
// The standalone translator rather than useLanguage: this screen is mounted at
// the router root, above LanguageProvider, so the hook would have no context
// to read. Copy still follows the saved language preference.
import { t } from "@/utils/standaloneTranslation";

/**
 * The screen shown immediately before iOS asks about tracking.
 *
 * Apple permits a pre-prompt and reviewers expect one; what gets rejected is a
 * pre-prompt that misrepresents the choice, or one that lets the player dead-end
 * before the system dialog ever appears. The previous version did the latter —
 * "Not now" closed it and deliberately never asked iOS, permanently. That is a
 * large part of why build 34 came back as "unable to locate the App Tracking
 * Transparency permission request".
 *
 * So there is one action, and it leads to Apple's dialog. The real refusal
 * lives there, in "Ask App Not to Track", where iOS records it and the player
 * can revisit it in Settings. This screen's job is only to make the question
 * make sense before it is asked.
 *
 * Full-bleed rather than a modal card, because at launch it is the first thing
 * the player sees and a sheet floating over an empty app reads as an error.
 *
 * Scrolling is its own: `nativeShell.ts` disables the webview's document
 * scroller for the life of the app, so a screen that merely grows is frozen on
 * the device (see CLAUDE.md §4b). The content column scrolls inside a fixed
 * `100dvh` box and the action stays pinned below it.
 */
export function TrackingConsentGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToPrePrompt(setOpen), []);

  const benefits = [
    { icon: Sparkles, title: t("att.pointRelevantTitle"), body: t("att.pointRelevantBody") },
    { icon: Gift, title: t("att.pointFreeTitle"), body: t("att.pointFreeBody") },
    { icon: Lock, title: t("att.pointPrivateTitle"), body: t("att.pointPrivateBody") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[10000] flex h-[100dvh] flex-col bg-[#2A1A3E]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="att-title"
        >
          {/* Ambient wash. Purely decorative, and behind everything. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_0%,#4C2A7A_0%,#2A1A3E_58%,#1E1230_100%)]"
          />

          <div className="relative flex min-h-0 flex-1 flex-col safe-bleed">
            {/* Scrolls itself — the document cannot. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-10 pb-6">
              <div className="mx-auto flex w-full max-w-[420px] flex-col">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 22 }}
                  className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-violet-500/20 ring-1 ring-inset ring-violet-300/30"
                >
                  <ShieldCheck className="h-9 w-9 text-violet-200" strokeWidth={1.75} />
                </motion.div>

                <h2
                  id="att-title"
                  className="mt-6 text-center font-display text-[28px] font-bold leading-[1.15] text-white"
                >
                  {t("att.title")}
                </h2>

                <p className="mx-auto mt-3 max-w-[34ch] text-center text-[15.5px] leading-relaxed text-violet-100/70">
                  {t("att.body")}
                </p>

                <ul className="mt-8 flex flex-col gap-3">
                  {benefits.map(({ icon: Icon, title, body }) => (
                    <li
                      key={title}
                      className="flex gap-3.5 rounded-[18px] bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-400/15">
                        <Icon className="h-[18px] w-[18px] text-violet-200" strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-white">{title}</span>
                        <span className="mt-0.5 block text-[13.5px] leading-snug text-violet-100/60">
                          {body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pinned action. Always reachable, whatever the content height. */}
            <div className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
              <div className="mx-auto w-full max-w-[420px]">
                <button
                  onClick={acknowledgePrePrompt}
                  autoFocus
                  className="h-[54px] w-full rounded-[18px] bg-white text-[17px] font-bold text-[#2A1A3E] transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                >
                  {t("att.continue")}
                </button>
                <p className="mt-3 text-center text-[12.5px] leading-snug text-violet-100/45">
                  {t("att.footnote")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
