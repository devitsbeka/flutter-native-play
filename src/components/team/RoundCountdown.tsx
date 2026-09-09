import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { getCategoryIconSlug } from "@/data/categoryIconMap";
import {
  isUndecidedRound,
  undecidedRoundKind,
  UNDECIDED_ICON_SLUG,
} from "@/utils/undecidedRound";

interface RoundCountdownProps {
  /**
   * The digit to show, from useRoundCountdown. null keeps the screen up with
   * no number on it, for a player whose questions have not arrived by the time
   * the count runs out — the alternative is dropping them back to the lobby
   * for a moment on the way to a round that has already started.
   */
  number: number | null;
  categoryId: string | null | undefined;
  categoryName: string | null | undefined;
  /** `categories.icon_slug`, resolved by the caller. */
  iconSlug?: string | null;
  /** The room this round is played in: its face and its name, for the pill at the top. */
  roomName?: string | null;
  roomIcon?: string | null;
  /** Which game and which round of it — shown under the room's name when known. */
  matchInfo?: { game: number; round: number } | null;
}

/**
 * What is about to be played, and how long until it is.
 *
 * A round used to open with question one already on screen and the clock
 * running. A player who had wandered off to another page came back mid-
 * question, and even one watching the lobby got no moment to read what the
 * category was.
 *
 * Presentational only — the digit is worked out by useRoundCountdown from the
 * room's start time, so every player sees the same number at the same moment,
 * including one who was on Discover a second ago and has just been brought
 * here.
 */
export function RoundCountdown({ number, categoryId, categoryName, iconSlug, roomName, roomIcon, matchInfo }: RoundCountdownProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  // An undecided round is named in the language of whoever picked it, and
  // useLocalizedCategoryName cannot translate it: "mixed" is not a row in
  // `categories`, so the stored string passes through untouched. That is how
  // an English host saw "სხვადასხვა" on the screen before their own game.
  // Say it in the viewer's language instead.
  const undecided = undecidedRoundKind(categoryId, categoryName);
  const title = undecided
    ? t(undecided === "mixed" ? "extra.mixedCategory" : "extra.cpRandomTitle")
    : localizeCategory(categoryName || "") || t("extra.categoryType");

  // Both slugs, best first. DynamicIcon takes a comma-separated list and tries
  // them in order, which is what this needs: the database's icon_slug is the
  // category's own answer and usually right, but two categories name an icon
  // that is missing from the shipped index — archaeology → "archeo",
  // economics → "economics-icon". Both files exist in storage, so they can
  // still resolve on the async lookup; the point of the second slug is that
  // something correct is on screen immediately rather than after a round trip
  // this screen may not live long enough to see.
  //
  // A "mixed" or "random" round is the exception: it HAS no category to carry
  // an icon, so both slugs are empty and DynamicIcon's last resort — a grey
  // question mark — was the picture the whole app otherwise draws as the
  // mystery box.
  const mapSlug = categoryId ? getCategoryIconSlug(categoryId) : null;
  // Undecided by name or id — or by having nothing at all: a round with no
  // category id and no icon of any kind is not a real category, whatever
  // its stored name says (a picker's word this list does not know, or a
  // writer that stored something else). Both used to fall through to the
  // grey question mark here, and did (owner: "shown as question mark when
  // game starts on 3,2,1 screen").
  const mystery = isUndecidedRound(categoryId, categoryName) || (!categoryId && !iconSlug && !mapSlug);
  const slug = mystery
    ? UNDECIDED_ICON_SLUG
    : [iconSlug, mapSlug].filter(Boolean).join(",") || null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-[#2E1065] px-8 text-center">
      {/* Which room, and which game and round of it — the results screen's
          pill, at the top, so the count says where it is being counted
          (owner: "show room icon + title game-round info here too"). */}
      {roomName && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute inset-x-0 top-[calc(12px_+_var(--safe-top,0px))] flex justify-center px-4"
        >
          <div className="flex max-w-[294px] items-center gap-3 rounded-full bg-white/15 py-2 pl-3 pr-5 backdrop-blur-sm">
            {roomIcon && <img src={roomIcon} alt="" className="h-10 w-10 shrink-0 object-contain drop-shadow-sm" />}
            <div className="min-w-0 flex flex-col text-left">
              <span className="truncate font-[Nunito] text-[16px] font-medium leading-6 tracking-[-0.16px] text-white">
                {roomName}
              </span>
              {matchInfo && (
                <span className="text-[12px] font-bold uppercase leading-[18px] tracking-[0.3px] text-white/60">
                  {t("extra.matchRoundLabel", { game: matchInfo.game, round: matchInfo.round })}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Resolve the icon-library slug explicitly rather than leaving
            DynamicIcon to guess from the category id. Given an id it cannot
            place — a uuid, which some rooms store — its last resort is a
            random icon hashed from that id, which is how this screen came to
            show a banana for "guess the city". */}
        <CategoryArtwork categoryId={mystery ? null : categoryId} iconSlug={slug} size={120} />
        <h2 className="max-w-[18rem] break-words font-display text-2xl font-bold leading-tight text-white">
          {title}
        </h2>
      </motion.div>

      {/* Keyed on the number so each digit gets its own entry animation.
          Once the count is spent the digit gives way to a pulse rather than
          the screen giving way to the lobby — same height either way, so
          nothing jumps when it changes. */}
      {number !== null ? (
        <motion.div
          key={number}
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="font-display text-[6rem] font-black leading-none text-white drop-shadow-[0_6px_24px_rgba(255,255,255,0.35)]"
          aria-live="polite"
        >
          {number}
        </motion.div>
      ) : (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-[6rem] items-center"
          aria-live="polite"
        >
          <Loader2 className="h-12 w-12 animate-spin text-white/80" />
        </motion.div>
      )}

      <p className="text-sm font-medium text-white/60">{t("extra.roundStartingSoon")}</p>
    </div>
  );
}
