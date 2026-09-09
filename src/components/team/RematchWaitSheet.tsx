/**
 * The host, after asking the table for a rematch.
 *
 * Every seat has the "Rematch?" card in front of it; this is the host's
 * side of the same moment - who has said yes, who is still deciding, who
 * has already left - and the way to start with whoever is in. A seat that
 * declined is gone from the list (the seat itself was given up); a seat
 * still deciding when the host starts is removed from the room, because
 * whoever plays is staked and nobody is staked for a game they did not
 * say yes to (owner: "who accepts plays the match, who do not leaves the
 * room, and pot changes based on players count").
 *
 * The lobby's own sheet, like the match summary before it.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import buzzerIcon from "@/assets/trivia-buzzer.png";
import coinIcon from "@/assets/tb-lobby/coin.png";

export interface RematchSeat {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  ready: boolean;
}

interface RematchWaitSheetProps {
  open: boolean;
  seats: RematchSeat[];
  /** Per seat; the pot shown is the host plus every seat that said yes. */
  stake: number;
  starting?: boolean;
  onCancel: () => void;
  onStart: () => void;
}

export function RematchWaitSheet({ open, seats, stake, starting = false, onCancel, onStart }: RematchWaitSheetProps) {
  const { t } = useLanguage();
  const ready = seats.filter((s) => s.ready).length;
  const undecided = seats.length - ready;
  const playing = ready + 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px] p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          onClick={onCancel}
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
              <div className="mb-5 flex flex-col items-center text-center">
                <img src={buzzerIcon} alt="" className="h-16 w-16 shrink-0 object-contain" />
                <h3 className="mt-3 font-display text-[24px] font-bold leading-[30px] text-[#402666]">
                  {t("extra.rematchWaitTitle")}
                </h3>
                <p className="mt-2 max-w-[300px] text-[14px] leading-[20px] text-[#402666]/70">
                  {t("extra.rematchWaitHint")}
                </p>
              </div>

              <ul className="mb-4 max-h-[236px] space-y-2 overflow-y-auto">
                {seats.map((seat) => (
                  <li
                    key={seat.user_id}
                    className="flex items-center gap-3 rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2"
                  >
                    <SafeAvatarImage
                      avatarUrl={seat.avatar_url}
                      fallback={seat.nickname}
                      containerClassName="h-9 w-9 shrink-0 overflow-hidden rounded-full"
                    />
                    <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-[#402666]">
                      {seat.nickname}
                    </span>
                    {seat.ready ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2bc889]/15 px-2.5 py-1 text-xs font-bold text-[#1f9c6a]">
                        <Check className="h-3.5 w-3.5" />
                        {t("extra.rematchWaitReady")}
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#402666]/[0.07] px-2.5 py-1 text-xs font-bold text-[#402666]/60">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t("extra.rematchWaitPending")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                <span className="text-[12px] text-[#402666]/60">{t("lobby.winnerTakes")}</span>
                <span className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                  <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                  {(playing * stake).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-3">
                <ChunkyButton variant="outline" size="md" className="flex-1" onClick={onCancel} disabled={starting}>
                  {t("common.cancel")}
                </ChunkyButton>
                <ChunkyButton
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={onStart}
                  disabled={starting || ready === 0}
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("extra.rematchWaitStart", { count: playing })}
                </ChunkyButton>
              </div>
              {undecided > 0 && ready > 0 && (
                <p className="mt-3 text-center text-[12px] leading-4 text-[#402666]/60">
                  {t("extra.rematchWaitUndecided", { count: undecided })}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
