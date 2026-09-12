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

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RoomCardPlayButton, type RoomCardTone } from "@/components/team/RoomCardPlayButton";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { roundIconSlug } from "@/utils/ownTriviaRound";
import { undecidedRoundKind } from "@/utils/undecidedRound";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategoryIconByName, useCategoryIdByName, useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { REWARDS } from "@/config/rewardConfig";
import { firstPlaceShare } from "@/utils/roomPot";
import coinIcon from "@/assets/tb-lobby/coin.png";
import questionIcon from "@/assets/lobby/chip-question.webp";

export interface PreviewRound {
  name: string | null;
  icon_slug: string | null;
  source_type: string;
}

/**
 * The round a room plays when its host has queued none: mixed, out of every
 * category, with the mystery box for a face. The card already says so —
 * its category chip reads "Mixed" for such a room — and the sheet said
 * "the host has not picked a round yet" under a count of 0, which called
 * the same room two different things (owner: "show mixed category instead
 * 'the host has not picked a round yet'"). One row, "Mixed", Round 1.
 */
export const MIXED_ROUND: PreviewRound = { name: null, icon_slug: null, source_type: "mixed" };

/**
 * Is this row a mixed round? The stand-in above, or a queued one — which
 * the pickers store as a "category" named "Mixed" in the picker's own
 * language, with no slug, so the name is what there is to go on.
 */
export function isMixedRound(round: PreviewRound): boolean {
  return round.source_type === "mixed" || undecidedRoundKind(null, round.name) === "mixed";
}

/**
 * The card's own button, drawn again inside the sheet.
 *
 * The sheet used to close and nothing else: the way in was the card's
 * button, deliberately not repeated. But a player who has just read what a
 * room plays and what it costs is exactly the player who wants the way in,
 * and sending them back out to the card for it is a tap for nothing
 * (owner: "show same button what we show on card next to the close button
 * when user taps on card to see categories in round, make sure buttons
 * have same styles"). So the CARD hands the sheet a factory for the same
 * button it draws — same tone, same word, same tap — and the sheet gives
 * it the sheet's size and asks it to close the sheet afterwards.
 */
export type PreviewActionFactory = (opts?: { className?: string; tone?: RoomCardTone; then?: () => void }) => ReactNode;

/** Both buttons in the sheet's footer wear this: the card's pill, one size up. */
export const PREVIEW_BUTTON_CLASS = "flex-1 justify-center py-3 text-[15px]";
/**
 * The sheet's button is green whatever the card's was. On the card the
 * colour says which room is one tap from a game; in the sheet the reader
 * has just read the rounds and the stake and is one tap from it by
 * definition, so it wears the mint every such button wears (owner: "show
 * join button as green button on room preview modals").
 */
export const PREVIEW_BUTTON_TONE: RoomCardTone = "mint";

interface RoomPreviewSheetProps {
  open: boolean;
  roomName: string;
  rounds: PreviewRound[];
  /** Null when the room brings its own trivia and its own question count. */
  questionsPerRound: number | null;
  /** How many are seated — the pot is that many stakes. */
  players: number;
  /** The card's button, already sized for the sheet; nothing when the card has none. */
  action?: ReactNode;
  onClose: () => void;
}

export function RoomPreviewSheet({
  open,
  roomName,
  rounds,
  questionsPerRound,
  players,
  action,
  onClose,
}: RoomPreviewSheetProps) {
  const { t } = useLanguage();
  /**
   * Each round in the reader's language. A round is stored under the name
   * the host's picker was showing — "Guess the Logo" from an English
   * client — and the sheet drew that literal string under a Georgian UI;
   * "Random" and "Mixed" likewise (owner: "if i switch country to Georgia
   * categories need translations"). The resolver every other round list
   * uses maps any of the seven languages to the viewer's, and passes a
   * trivia's own title through untouched.
   */
  const localizeCategory = useLocalizedCategoryName();
  // A round whose queue row carries no icon (a Guess category, a room's own
  // category copied into the list) drew the empty box here while the card
  // beside it drew the category's face off its name. Same resolver.
  const iconForCategory = useCategoryIconByName();
  const idForCategory = useCategoryIdByName();
  // A seat costs the stake wherever it is taken — a room, a quick game, PRO
  // or not (see 20261102140000_quick_game_charges_everyone.sql). Under two
  // players there is no pot at all: settle_room_round calls that practice.
  // "Winner takes" is first place's share of the pot, not the pot
  // (firstPlaceShare): 70% of it at three or more players.
  const stake = REWARDS.GAME_STAKE;
  const pot = firstPlaceShare(players, stake);
  // No queue is a mixed round, not no round (MIXED_ROUND).
  const shown = rounds.length > 0 ? rounds : [MIXED_ROUND];

  /**
   * Drawn on <body>, not where it is written.
   *
   * The sheet is `fixed inset-0 z-[120]` and the bottom nav is `z-50`, so
   * on the page it wins — but z-index only ranks siblings within a
   * stacking context, and the home's feed sits in a `relative z-10`
   * wrapper (MobileHomeScroll). Everything the rail renders is ranked
   * inside THAT, at 10, and the nav sat over the sheet with its green
   * play button across it (owner: "nav bar covering modal when i click
   * on room cards on main page"). A portal to <body> leaves every
   * ancestor context behind — the same fix the other overlays these
   * sections open already carry (game-modal, InviteFriendsModal).
   */
  const sheet = (
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
                {t("lobby.summaryRounds")} · {shown.length}
              </p>
              {/* The lobby's own round rows (RoundOrderModal): the number,
                  the icon in a tile, the name over "Round N". The rows
                  used to hand the icon a CSS size the icon ignores — it
                  defaults to 128px — and a random round carried no slug,
                  so each row swelled around a giant faint placeholder
                  (owner: "show more narrow containers for each category
                  with icons"). A random round wears the mystery box the
                  rest of the app draws for it; a MIXED round wears the
                  question mark — it carried no slug and the tile came up
                  empty (owner: "as a mixed category icon use this
                  question mark icon, it is empty now"). */}
              <ol className="mb-5 max-h-[240px] space-y-2 overflow-y-auto">
                  {shown.map((round, i) => (
                    <li
                      key={`${round.name ?? "round"}-${i}`}
                      className="flex min-h-[58px] items-center gap-2 rounded-xl border border-[#e8e0f5] bg-white/70 py-2 pl-2 pr-3"
                    >
                      <span className="w-5 shrink-0 text-center font-[Nunito] text-[13px] font-bold text-[#402666]/50">
                        {i + 1}
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#7126d5]/10">
                        {isMixedRound(round) ? (
                          <img src={questionIcon} alt="" className="h-7 w-7 object-contain" />
                        ) : (
                          // The face Discover gives the category: bundled
                          // art for the six picture games, the library glyph
                          // for the rest (CategoryArtwork).
                          <CategoryArtwork
                            categoryId={idForCategory(round.name)}
                            iconSlug={roundIconSlug({ ...round, category_name: round.name }) ?? iconForCategory(round.name) ?? "mystery-box"}
                            size={28}
                            flat
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-[#402666]">
                          {localizeCategory(round.name) ?? t("extra.cpMixedCategory")}
                        </span>
                        <span className="block text-xs text-[#402666]/60">
                          {t("lobby.uRoundLabel", { count: i + 1 })}
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>

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

              {/* Close, and beside it the card's own button — the same
                  pill the card draws, same tone and same word, so the way
                  in reads the same here as on the list. Both wear the
                  card's shape (owner: "make sure buttons have same
                  styles"); Close is the unfilled one, a stroke and no
                  white face, so the way in is the one that reads as a
                  button (owner: "close button do not need white color,
                  show with just stroke"). A card with no button (nothing
                  to offer yet) leaves Close on its own. */}
              <div className="flex items-center gap-2">
                <RoomCardPlayButton tone="outline" className={PREVIEW_BUTTON_CLASS} onClick={onClose}>
                  {t("common.close")}
                </RoomCardPlayButton>
                {action}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}
