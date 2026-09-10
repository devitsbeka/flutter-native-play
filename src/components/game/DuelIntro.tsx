/**
 * The duel, before it starts: what is being played, who against, and for
 * how much.
 *
 * A picture game from the Guess card is one match against Trivia King, the
 * app's own mascot, for a pot of two stakes. The player should see all three
 * before the first picture — the category, the King's face, the pot — which
 * is what a match screen is for (owner: "show category what player is going
 * to play, show trivia king mascot and pot").
 *
 * It is not the versus screen the quick game uses: that one waits on a
 * stranger. This one has nobody to wait for and one button.
 */

import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { REWARDS } from "@/config/rewardConfig";
import crownMascot from "@/assets/crown-mascot.png";
import coinIcon from "@/assets/tb-lobby/coin.png";

interface DuelIntroProps {
  categoryId: string | null;
  categoryName: string;
  iconSlug: string | null;
  playerAvatarUrl: string | null;
  /** Questions are still loading: the button waits on them. */
  loading: boolean;
  onPlay: () => void;
  onBack: () => void;
}

export function DuelIntro({ categoryId, categoryName, iconSlug, playerAvatarUrl, loading, onPlay, onBack }: DuelIntroProps) {
  const { t } = useLanguage();
  const stake = REWARDS.GUESS_STAKE;
  const pot = stake * 2;

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] flex flex-col">
      <div className="flex items-center px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="m-auto flex w-full max-w-sm flex-col items-center px-6 text-center"
      >
        {/* What is being played. */}
        <CategoryArtwork categoryId={categoryId} iconSlug={iconSlug} size={96} className="drop-shadow-lg" />
        <p className="mt-3 font-display text-[22px] font-bold leading-7 text-white">{categoryName}</p>
        <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.3px] text-white/60">{t("extra.duelTitle")}</p>

        {/* Who against. */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <QuizPlayerAvatar avatarUrl={playerAvatarUrl} size="large" state="active" />
            <span className="font-display text-[16px] font-bold text-white">{t("game.you")}</span>
          </div>
          <span className="font-display text-[28px] font-black italic text-white/80">VS</span>
          <div className="flex flex-col items-center gap-2">
            <QuizPlayerAvatar avatarUrl={crownMascot} size="large" state="active" />
            <span className="font-display text-[16px] font-bold text-white">{t("extra.duelOpponent")}</span>
          </div>
        </div>

        {/* For how much. */}
        <div className="mt-8 w-full rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-white/70">{t("lobby.summaryStake")}</span>
            <span className="flex items-center gap-1.5 font-display text-[18px] font-bold text-white">
              <img src={coinIcon} alt="" className="h-5 w-5 object-contain" />
              {stake.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2">
            <span className="text-[13px] text-white/70">{t("lobby.winnerTakes")}</span>
            <span className="flex items-center gap-1.5 font-display text-[22px] font-bold text-[#ffe08a]">
              <img src={coinIcon} alt="" className="h-6 w-6 object-contain" />
              {pot.toLocaleString()}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-white/70">{t("extra.duelIntroHint")}</p>

        <ChunkyButton
          variant="mint"
          size="lg"
          className="mt-6 w-full"
          onClick={onPlay}
          disabled={loading}
          icon={<Play className="h-5 w-5 fill-current" />}
        >
          {t("extra.roomPlay")}
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
