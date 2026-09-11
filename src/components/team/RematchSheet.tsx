/**
 * The rematch, from the question to the start, on one sheet.
 *
 * It used to be two: the match summary in a "rematch dress" asked the
 * question (a buzzer, the rounds, the stake), and a second sheet appeared
 * afterwards with the faces and the answers. So the table — the people the
 * host is actually asking — was absent from the ask, and the rounds and the
 * stake were absent from the wait, and the two screens shared nothing but a
 * corner radius.
 *
 * One sheet now, three states, and what does not change stays put (owner:
 * "instead what we show on rematch flow we should show like on screenshot 2
 * than show waiting (players deciding) ... and when i or more players would
 * confirm to play new game we show start game button"):
 *
 *   ask     the faces, whoever won the last round named in the title, the
 *           rounds and what a seat pays. Ask Rematch.
 *   asked   the same sheet with every face waiting on an answer: "Deciding…"
 *           under each, and a button that says it is waiting too.
 *   asked,  the moment anybody says yes: the answers in colour, the stake
 *   with a  tile becomes what first place takes from the pot those yeses
 *   yes     make, and the button starts the game.
 *
 * A seat still deciding when the host starts is removed from the room,
 * because whoever plays is staked and nobody is staked for a game they did
 * not say yes to (owner: "who accepts plays the match, who do not leaves the
 * room, and pot changes based on players count").
 *
 * "Who did not" includes the noes, which is why a seat's answer is passed in
 * rather than read here: declining gives the seat up, so the row is gone
 * from the room and only the caller's snapshot of who was ASKED still knows
 * that person was ever at the table.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Play, X } from "lucide-react";
import { RoomCardPlayButton } from "@/components/team/RoomCardPlayButton";
import { PREVIEW_BUTTON_CLASS } from "@/components/team/RoomPreviewSheet";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import type { SummaryRound } from "@/components/team/MatchSummarySheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import coinIcon from "@/assets/tb-lobby/coin.png";
import { firstPlaceShare } from "@/utils/roomPot";

/** Said yes, still deciding, or gave the seat up. */
export type RematchAnswer = "ready" | "waiting" | "declined";

/** Before the table is asked, or after. */
export type RematchPhase = "ask" | "asked";

export interface RematchSeat {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  answer: RematchAnswer;
  /** In the app right now — the green dot, as the players list draws it. */
  online?: boolean;
  /** Took the last round. Wears the gold ring while the question is asked. */
  isWinner?: boolean;
}

interface RematchSheetProps {
  open: boolean;
  phase: RematchPhase;
  seats: RematchSeat[];
  /** Who took the last round, for the title. Absent when nobody has yet. */
  winnerName?: string | null;
  /** What the rematch will play, in order. */
  rounds: SummaryRound[];
  /** Null when the room plays a trivia that brings its own question count. */
  questionsPerRound: number | null;
  /**
   * Per seat; once somebody has said yes the tile shows what first place
   * takes from a pot of the host plus every yes (firstPlaceShare).
   */
  stake: number;
  starting?: boolean;
  onCancel: () => void;
  onAsk: () => void;
  onStart: () => void;
}

export function RematchSheet({
  open,
  phase,
  seats,
  winnerName,
  rounds,
  questionsPerRound,
  stake,
  starting = false,
  onCancel,
  onAsk,
  onStart,
}: RematchSheetProps) {
  const { t } = useLanguage();
  const ready = seats.filter((s) => s.answer === "ready").length;
  const undecided = seats.filter((s) => s.answer === "waiting").length;
  const playing = ready + 1;
  const asked = phase === "asked";
  // The pot is only real once somebody is in it: until then the tile says
  // what a seat pays, which is the number the host is deciding on.
  const showsPot = asked && ready > 0;

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
              {/* The table, first: these are the people being asked, and
                  once they are asked they are the thing being waited on.
                  The list scrolls when the table is long, and a scroller
                  clips to its padding box — the ring around each face is a
                  2px shadow OUTSIDE the face's box, so with no padding the
                  top of every ring was cut flat (owner: "make sure avatar
                  is not cropped, top is not visible, needs space above").
                  The padding is the ring's room. */}
              <ul className="mb-4 flex max-h-[232px] flex-wrap items-start justify-center gap-x-3 gap-y-4 overflow-y-auto px-2 pt-2 pb-1">
                {seats.map((seat) => (
                  <RematchFace key={seat.user_id} seat={seat} asked={asked} />
                ))}
              </ul>

              <div className="mb-5 flex flex-col items-center text-center">
                <h3 className="font-display text-[24px] font-bold leading-[30px] text-[#402666]">
                  {asked
                    ? t("extra.rematchWaitTitle")
                    : winnerName
                      ? t("extra.rematchWonTitle", { name: winnerName })
                      : t("lobby.summaryRematchTitle")}
                </h3>
                <p className="mt-2 max-w-[300px] text-[14px] leading-[20px] text-[#402666]/70">
                  {asked ? t("extra.rematchWaitHint") : t("lobby.summaryRematchHint")}
                </p>
              </div>

              {/* What the rematch plays, on the ask AND on the wait: the host
                  is answering "shall we play this again", and the answer
                  needs the "this" in front of it the whole time. */}
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#402666]/60">
                {t("lobby.summaryRounds")} · {rounds.length}
              </p>
              <ol className="mb-4 max-h-[236px] space-y-2 overflow-y-auto">
                {rounds.map((round, i) => (
                  <li
                    key={`${i}-${round.name}`}
                    className="flex items-center gap-3 rounded-xl border border-[#e8e0f5] bg-white/70 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7126d5]/10 font-[Nunito] text-xs font-bold text-[#7126d5]">
                      {i + 1}
                    </span>
                    <CategoryArtwork categoryId={round.categoryId ?? undefined} iconSlug={round.iconSlug ?? "mystery-box"} size={28} flat />
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
                  <p className="text-[12px] text-[#402666]/60">
                    {showsPot ? t("lobby.winnerTakes") : t("lobby.summaryStake")}
                  </p>
                  <p className="flex items-center gap-1.5 font-display text-[20px] font-bold leading-6 text-[#402666]">
                    <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
                    {(showsPot ? (firstPlaceShare(playing, stake) ?? 0) : stake).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Cancel keeps its one word and the answer takes the rest, on
                  one line. pt-[10px]: the outline tone draws a 2px border
                  along its top that the mint one does not, so the same py-3
                  made Cancel two pixels taller (owner: "reduce height to
                  match"). */}
              <div className="flex items-center gap-2">
                <RoomCardPlayButton
                  tone="outline"
                  className={`${PREVIEW_BUTTON_CLASS} flex-none pt-[10px] whitespace-nowrap`}
                  onClick={onCancel}
                  disabled={starting}
                >
                  {t("common.cancel")}
                </RoomCardPlayButton>
                <RoomCardPlayButton
                  tone="mint"
                  className={`${PREVIEW_BUTTON_CLASS} min-w-0 whitespace-nowrap px-3`}
                  onClick={asked ? onStart : onAsk}
                  disabled={starting || (asked && ready === 0)}
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !asked ? (
                    t("lobby.summaryAskTable")
                  ) : ready === 0 ? (
                    t("extra.rematchWaiting")
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {t("extra.rematchWaitStart", { count: playing })}
                    </>
                  )}
                </RoomCardPlayButton>
              </div>
              {asked && undecided > 0 && ready > 0 && (
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
 * One seat at the table: the face in its circle, the name under it, and —
 * once the table has been asked — what they have answered.
 *
 * The circle is the players list's own, so a face here reads as the same
 * person the host was just sitting with. Before the ask nobody has an
 * answer to show: every face is in colour, the winner of the last round
 * wears the gold ring, and whoever is in the app wears the green dot. After
 * it, only a yes stays in colour — deciding and declined go grey, which is
 * the whole answer at a glance.
 */
function RematchFace({ seat, asked }: { seat: RematchSeat; asked: boolean }) {
  const { t } = useLanguage();
  const said = seat.answer;
  const dimmed = asked && said !== "ready";
  return (
    <li className="flex w-[76px] flex-col items-center gap-1.5">
      <span className="relative block">
        <span
          className={cn(
            "block h-14 w-14 overflow-hidden rounded-full bg-[#e9d8ff]",
            asked
              ? said === "ready"
                ? "shadow-[0px_0px_0px_2px_rgba(43,200,137,0.85)]"
                : "shadow-[0px_0px_0px_2px_rgba(148,163,184,0.75)]"
              : seat.isWinner
                ? "shadow-[0px_0px_0px_3px_rgba(252,211,77,0.95)]"
                : "shadow-[0px_0px_0px_2px_rgba(232,224,245,1)]",
            dimmed && "opacity-45 grayscale",
          )}
        >
          <SafeAvatarImage
            avatarUrl={seat.avatar_url}
            fallback={seat.nickname}
            containerClassName="h-full w-full"
          />
        </span>
        {/* Before the ask the badge says who is here to be asked; after it,
            what they said. */}
        {asked ? (
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
        ) : (
          seat.online && (
            <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 block h-[14px] w-[14px] rounded-full border-2 border-white bg-[#2bc889]" />
          )
        )}
      </span>
      <span className="w-full truncate text-center font-display text-[12px] font-bold leading-4 text-[#402666]">
        {seat.nickname}
      </span>
      {asked && (
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
      )}
    </li>
  );
}
