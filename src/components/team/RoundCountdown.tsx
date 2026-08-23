import { motion } from "framer-motion";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { getCategoryIconSlug } from "@/data/categoryIconMap";

interface RoundCountdownProps {
  /** The digit to show, from useRoundCountdown. */
  number: number;
  categoryId: string | null | undefined;
  categoryName: string | null | undefined;
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
export function RoundCountdown({ number, categoryId, categoryName }: RoundCountdownProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const title = localizeCategory(categoryName || "") || t("extra.categoryType");

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-[#2E1065] px-8 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Resolve the icon-library slug explicitly rather than leaving
            DynamicIcon to guess from the category id. Categories all have a
            library icon; falling through to the emoji in categories.icon is
            what put a flat emoji on the last screen before a round starts. */}
        <CategoryArtwork
          categoryId={categoryId}
          iconSlug={categoryId ? getCategoryIconSlug(categoryId) : null}
          size={120}
        />
        <h2 className="max-w-[18rem] break-words font-display text-2xl font-bold leading-tight text-white">
          {title}
        </h2>
      </motion.div>

      {/* Keyed on the number so each digit gets its own entry animation. */}
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

      <p className="text-sm font-medium text-white/60">{t("extra.roundStartingSoon")}</p>
    </div>
  );
}
