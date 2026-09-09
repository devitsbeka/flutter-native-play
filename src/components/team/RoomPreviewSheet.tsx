/**
 * What a room plays, and what a seat in it costs.
 *
 * A card used to be one thing: a tap joined it, or asked its host to. That
 * made the list an unreadable place to choose from — the card can show one
 * round and a count, and the only way to find out what the other rounds
 * were was to commit to the room and look from inside it.
 *
 * So the tap splits in two (owner: "clicking on card would show categories
 * picked in this room, only button click opens room, sends request to a
 * host etc.. click on card shows categories list and cost for
 * participating"). The BUTTON still joins, enters, plays — one deliberate
 * target with a word on it. The CARD opens this: every round in order, the
 * questions in each, and the stake, before anything is committed to.
 *
 * The same sheet on both tabs. A public room and a private one are the same
 * question — what am I about to play, and what does it cost — and answering
 * it twice would eventually answer it two different ways.
 */

import { motion, AnimatePresence } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/tb-lobby/coin.png";

export interface PreviewRound {
  name: string | null;
  icon_slug: string | null;
  source_type: string;
}

interface RoomPreviewSheetProps {
  open: boolean;
  roomName: string;
  rounds: PreviewRound[];
  /** Null when the room brings its own trivia and its own question count. */
  questionsPerRound: number | null;
  /** How many are seated — the pot is that many stakes. */
  players: number;
  onClose: () => void;
}

export function RoomPreviewSheet({
  open,
  roomName,
  rounds,
  questionsPerRound,
  players,
  onClose,
}: RoomPreviewSheetProps) {
  const { t } = useLanguage();
  // A seat costs the stake wherever it is taken — a room, a quick game, PRO
  // or not (see 20261102140000_quick_game_charges_everyone.sql). Under two
  // players there is no pot at all: settle_room_round calls that practice.
  const stake = REWARDS.GAME_STAKE;
  const pot = players >= 2 ? players * stake : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px] p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          onClick={onClose}
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
              <div className="mb-5 text-center">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#402666]/50">
                  {t("extra.roomPreviewEyebrow")}
                </p>
                <h3 className="mt-1 font-display text-[22px] font-bold leading-7 text-[#402666]">
                  {roomName}
                </h3>
              </div>

              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#402666]/50">
                {t("lobby.summaryRounds")} · {rounds.length}
              </p>
              {rounds.length > 0 ? (
                <ol className="mb-5 max-h-[240px] space-y-2 overflow-y-auto">
                  {rounds.map((round, i) => (
                    <li
                      key={`${round.name ?? "round"}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1e9ff] font-display text-[13px] font-bold text-[#7126d5]">
                        {i + 1}
                      </span>
                      <DynamicIcon slug={round.icon_slug ?? undefined} className="h-6 w-6 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-[#402666]">
                        {round.name ?? t("extra.cpMixedCategory")}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                // A room whose host has not picked yet. Saying so beats an
                // empty box, and beats inventing a round that is not there.
                <p className="mb-5 rounded-xl border border-dashed border-[#e8e0f5] bg-white/50 px-3 py-4 text-center text-[14px] leading-5 text-[#402666]/60">
                  {t("extra.roomPreviewNoRounds")}
                </p>
              )}

              <div className={`mb-5 grid gap-2 ${questionsPerRound === null ? "grid-cols-1" : "grid-cols-2"}`}>
                {questionsPerRound !== null && (
                  <div className="rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                    <p className="text-[12px] text-[#402666]/60">{t("lobby.uQuestionsPerRound")}</p>
                    <p className="font-display text-[20px] font-bold leading-6 text-[#402666]">
                      {questionsPerRound}
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                  <p className="text-[12px] text-[#402666]/60">{t("lobby.summaryStake")}</p>
                  <p className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                    <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                    {stake.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* What the table is playing for, when there is a table. */}
              {pot !== null && (
                <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                  <span className="text-[12px] text-[#402666]/60">{t("lobby.winnerTakes")}</span>
                  <span className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                    <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                    {pot.toLocaleString()}
                  </span>
                </div>
              )}

              {/* One button, and it closes. Joining is the card's own button,
                  deliberately not repeated here: two ways in from two places
                  is how a tap ends up meaning something the player did not
                  intend, which is the whole reason this sheet exists. */}
              <ChunkyButton variant="outline" size="md" className="w-full" onClick={onClose}>
                {t("common.close")}
              </ChunkyButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
