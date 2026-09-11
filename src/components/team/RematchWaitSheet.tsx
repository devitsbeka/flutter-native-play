/**
 * The host, after asking the table for a rematch.
 *
 * Every seat has the "Rematch?" card in front of it; this is the host's
 * side of the same moment - who has said yes, who is still deciding, who
 * has said no - and the way to start with whoever is in. A seat still
 * deciding when the host starts is removed from the room, because whoever
 * plays is staked and nobody is staked for a game they did not say yes to
 * (owner: "who accepts plays the match, who do not leaves the room, and pot
 * changes based on players count").
 *
 * It is drawn as the table itself: the faces, in the same circle they wear
 * in the players list, each with what they have answered under it and a
 * badge on the face (owner: "show host- players avatars in circle how we
 * show it and show live who accept and who did not"). It replaced a list of
 * names under a buzzer, where the one thing the host was waiting on - the
 * answers - was the smallest thing on the sheet.
 *
 * "Who did not" includes the noes, which is why a seat's answer is passed in
 * rather than read here: declining gives the seat up, so the row is gone
 * from the room and only the caller's snapshot of who was ASKED still knows
 * that person was ever at the table.
 *
 * The lobby's own sheet, like the match summary before it.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Play, X } from "lucide-react";
import { RoomCardPlayButton } from "@/components/team/RoomCardPlayButton";
import { PREVIEW_BUTTON_CLASS } from "@/components/team/RoomPreviewSheet";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import coinIcon from "@/assets/tb-lobby/coin.png";
import { firstPlaceShare } from "@/utils/roomPot";

/** Said yes, still deciding, or gave the seat up. */
export type RematchAnswer = "ready" | "waiting" | "declined";

export interface RematchSeat {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  answer: RematchAnswer;
}

interface RematchWaitSheetProps {
  open: boolean;
  seats: RematchSeat[];
  /**
   * Per seat; the number shown is what first place takes from a pot of the
   * host plus every seat that said yes (firstPlaceShare).
   */
  stake: number;
  starting?: boolean;
  onCancel: () => void;
  onStart: () => void;
}

export function RematchWaitSheet({ open, seats, stake, starting = false, onCancel, onStart }: RematchWaitSheetProps) {
  const { t } = useLanguage();
  const ready = seats.filter((s) => s.answer === "ready").length;
  const undecided = seats.filter((s) => s.answer === "waiting").length;
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
              {/* The table, first: the faces are what the host is waiting on.
                  The list scrolls when the table is long, and a scroller
                  clips to its padding box - the ring around each face is a
                  2px shadow OUTSIDE the face's box, so with no padding the
                  top of every ring was cut flat (owner: "make sure avatar
                  is not cropped, top is not visible, needs space above").
                  The padding is the ring's room. */}
              <ul className="mb-4 flex max-h-[232px] flex-wrap items-start justify-center gap-x-3 gap-y-4 overflow-y-auto px-2 pt-2 pb-1">
                {seats.map((seat) => (
                  <RematchFace key={seat.user_id} seat={seat} />
                ))}
              </ul>

              <div className="mb-5 flex flex-col items-center text-center">
                <h3 className="font-display text-[24px] font-bold leading-[30px] text-[#402666]">
                  {t("extra.rematchWaitTitle")}
                </h3>
                <p className="mt-2 max-w-[300px] text-[14px] leading-[20px] text-[#402666]/70">
                  {t("extra.rematchWaitHint")}
                </p>
              </div>

              <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2.5">
                <span className="text-[12px] text-[#402666]/60">{t("lobby.winnerTakes")}</span>
                <span className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                  <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                  {(firstPlaceShare(playing, stake) ?? 0).toLocaleString()}
                </span>
              </div>

              {/* The preview sheet's pair: Cancel is the unfilled pill, and
                  Start is the mint one every button one tap from a game
                  wears, with the play triangle (owner: "show this button
                  with stroke and green button on this modal too").
                  Not split down the middle, though: Start says "with N
                  players", four words of Georgian, and at half the row it
                  wrapped to two lines. Cancel hugs its one word and Start
                  takes the rest, on one line (owner: "show start with 1
                  player on one row and reduce cancel button to fit"). */}
              <div className="flex items-center gap-2">
                {/* pt-[10px]: the outline tone draws a 2px border along its
                    top that the mint one does not, so the same py-3 made
                    Cancel two pixels taller than Start. Ten plus the border
                    is twelve, which is what Start's padding alone comes to
                    (owner: "reduce height to match 'start with' button"). */}
                <RoomCardPlayButton tone="outline" className={`${PREVIEW_BUTTON_CLASS} flex-none pt-[10px] whitespace-nowrap`} onClick={onCancel} disabled={starting}>
                  {t("common.cancel")}
                </RoomCardPlayButton>
                <RoomCardPlayButton
                  tone="mint"
                  className={`${PREVIEW_BUTTON_CLASS} min-w-0 whitespace-nowrap px-3`}
                  onClick={onStart}
                  disabled={starting || ready === 0}
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {t("extra.rematchWaitStart", { count: playing })}
                    </>
                  )}
                </RoomCardPlayButton>
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

/**
 * One asked seat: the face in its circle, a badge for the answer, the name
 * and the answer in words under it.
 *
 * The circle is the players list's own — same ring, same greying for
 * somebody who is not (yet) in — so a face here reads as the same person
 * the host was just sitting with. Only a yes comes up in colour; deciding
 * and declined are grey, which is the whole answer at a glance.
 */
function RematchFace({ seat }: { seat: RematchSeat }) {
  const { t } = useLanguage();
  const said = seat.answer;
  return (
    <li className="flex w-[76px] flex-col items-center gap-1.5">
      <span className="relative block">
        <span
          className={cn(
            "block h-14 w-14 overflow-hidden rounded-full bg-[#e9d8ff]",
            said === "ready"
              ? "shadow-[0px_0px_0px_2px_rgba(43,200,137,0.85)]"
              : "shadow-[0px_0px_0px_2px_rgba(148,163,184,0.75)]",
            said !== "ready" && "opacity-45 grayscale",
          )}
        >
          <SafeAvatarImage
            avatarUrl={seat.avatar_url}
            fallback={seat.nickname}
            containerClassName="h-full w-full"
          />
        </span>
        <span
          className={cn(
            "pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
            said === "ready" && "bg-[#2bc889]",
            said === "waiting" && "bg-[#9c64b5]",
            said === "declined" && "bg-[#e2556b]",
          )}
        >
          {said === "ready" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          {said === "waiting" && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={3} />}
          {said === "declined" && <X className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </span>
      <span className="w-full truncate text-center font-display text-[12px] font-bold leading-4 text-[#402666]">
        {seat.nickname}
      </span>
      <span
        className={cn(
          "w-full truncate text-center font-[Nunito] text-[10px] font-bold leading-3",
          said === "ready" && "text-[#1f9c6a]",
          said === "waiting" && "text-[#402666]/55",
          said === "declined" && "text-[#c2415a]",
        )}
      >
        {said === "ready"
          ? t("extra.rematchWaitReady")
          : said === "waiting"
            ? t("extra.rematchWaitPending")
            : t("extra.rematchWaitDeclined")}
      </span>
    </li>
  );
}
