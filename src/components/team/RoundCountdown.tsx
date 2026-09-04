import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { getCategoryIconSlug } from "@/data/categoryIconMap";
import { isUndecidedRound, UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";

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
export function RoundCountdown({ number, categoryId, categoryName, iconSlug }: RoundCountdownProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const title = localizeCategory(categoryName || "") || t("extra.categoryType");

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
  const slug = isUndecidedRound(categoryId, categoryName)
    ? UNDECIDED_ICON_SLUG
    : [iconSlug, mapSlug].filter(Boolean).join(",") || null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-[#2E1065] px-8 text-center">
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
        <CategoryArtwork categoryId={categoryId} iconSlug={slug} size={120} />
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
