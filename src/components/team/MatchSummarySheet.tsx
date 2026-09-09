/**
 * The host's last look before a match starts.
 *
 * Create used to start the match on the spot. Everything the tap commits to
 * - which rounds, how many questions, what every seat pays in - was spread
 * over the rules tab, the category chip and the pot line, and the moment
 * they were locked was the moment nobody was looking at them (owner: "show
 * hosts when they click create a mini resume, with a last chance to modify
 * room rules and categories, what they gonna play, how many questions per
 * round, and the cost").
 *
 * One sheet, the same one the Play-on-TV pairing wears over the lobby, so
 * it reads as the lobby's own. Change closes it back onto the rules; Start
 * is the tap that was Create.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import buzzerIcon from "@/assets/trivia-buzzer.png";
import coinIcon from "@/assets/tb-lobby/coin.png";

export interface SummaryRound {
  name: string;
  iconSlug: string | null;
}

interface MatchSummarySheetProps {
  open: boolean;
  rounds: SummaryRound[];
  /** Null when the room plays a trivia that brings its own question count. */
  questionsPerRound: number | null;
  /** Null when nobody else is seated: a solo round is practice and free. */
  stake: number | null;
  starting?: boolean;
  onChange: () => void;
  onConfirm: () => void;
}

export function MatchSummarySheet({
  open,
  rounds,
  questionsPerRound,
  stake,
  starting = false,
  onChange,
  onConfirm,
}: MatchSummarySheetProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px] p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          onClick={onChange}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-full max-w-[468px] max-h-full overflow-y-auto rounded-[24px] border-2 border-white/60 bg-[rgba(252,247,255,0.92)] p-2 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-[#e8e0f5] bg-white/50 p-6">
              <div className="mb-6 flex flex-col items-center text-center">
                <img src={buzzerIcon} alt="" className="h-20 w-20 shrink-0 object-contain" />
                <h3 className="mt-3 font-display text-[24px] font-bold leading-[30px] text-[#402666]">
                  {t("lobby.summaryTitle")}
                </h3>
                <p className="mt-2 max-w-[300px] text-[14px] leading-[20px] text-[#402666]/70">
                  {t("lobby.summaryHint")}
                </p>
              </div>

              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#402666]/60">
                {t("lobby.summaryRounds")} · {rounds.length}
              </p>
              {/* Three rows in full; a longer queue scrolls inside the list. */}
              <ol className="mb-4 max-h-[236px] space-y-2 overflow-y-auto">
                {rounds.map((round, i) => (
                  <li
                    key={`${i}-${round.name}`}
                    className="flex items-center gap-3 rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7126d5]/10 font-[Nunito] text-xs font-bold text-[#7126d5]">
                      {i + 1}
                    </span>
                    <DynamicIcon slug={round.iconSlug ?? "mystery-box"} size={28} shadow={false} />
                    <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-[#402666]">
                      {round.name}
                    </span>
                  </li>
                ))}
              </ol>

              <div className={cn("mb-5 grid gap-2", questionsPerRound === null ? "grid-cols-1" : "grid-cols-2")}>
                {questionsPerRound !== null && (
                  <div className="rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                    <p className="text-[12px] text-[#402666]/60">{t("lobby.uQuestionsPerRound")}</p>
                    <p className="font-display text-[20px] font-bold leading-6 text-[#402666]">{questionsPerRound}</p>
                  </div>
                )}
                <div className="rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                  <p className="text-[12px] text-[#402666]/60">{t("lobby.summaryStake")}</p>
                  {stake === null ? (
                    <p className="font-display text-[15px] font-bold leading-6 text-[#2bc889]">{t("lobby.summaryFree")}</p>
                  ) : (
                    <p className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                      <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                      {stake.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <ChunkyButton variant="outline" size="md" className="flex-1" onClick={onChange} disabled={starting}>
                  {t("lobby.summaryChange")}
                </ChunkyButton>
                <ChunkyButton variant="primary" size="md" className="flex-1" onClick={onConfirm} disabled={starting}>
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("lobby.uStartGame")}
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
