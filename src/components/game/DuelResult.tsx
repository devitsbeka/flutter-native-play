/**
 * The duel, decided: the two scores, who took the pot, and the ways on.
 *
 * Not the level result. A level result offers the next level and the
 * category's map, and a picture game from the Guess card is not a level of
 * anything — it is one match against Trivia King, and its exits are another
 * match or the guess games (owner: "do not take users in categories after
 * the match"). Progress is still saved underneath; it is just not what this
 * screen is about.
 */

import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { QuizPlayerAvatar } from "@/components/ui/quiz-player-avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DuelOutcome } from "@/utils/duelOpponent";
import triviaKingAvatar from "@/assets/trivia-king.png";
import { CoinDeltaPill } from "@/components/game/CoinDeltaPill";

interface DuelResultProps {
  outcome: DuelOutcome;
  /** The player's points, and the King's — what decided it. */
  score: number;
  mascotScore: number;
  /** Right answers, of `total`: the line under the two of them. */
  correct: number;
  total: number;
  /** What actually moved, once settled; null while it is settling. */
  delta: number | null;
  saving: boolean;
  playerAvatarUrl: string | null;
  onPlayAgain: () => void;
  onBack: () => void;
}

export function DuelResult({ outcome, score, mascotScore, correct, total, delta, saving, playerAvatarUrl, onPlayAgain, onBack }: DuelResultProps) {
  const { t } = useLanguage();
  const title = outcome === "win" ? t("extra.duelWin") : outcome === "lose" ? t("extra.duelLose") : t("extra.duelDraw");

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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="m-auto flex w-full max-w-sm flex-col items-center px-6 text-center"
      >
        <h2 className="font-display text-[26px] font-bold leading-8 text-white">{title}</h2>

        {/* The two of them, the winner's ring green. */}
        <div className="mt-6 flex items-end justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <QuizPlayerAvatar avatarUrl={playerAvatarUrl} size="large" score={score} state={outcome === "win" ? "correct" : outcome === "lose" ? "wrong" : "default"} />
            <span className="font-display text-[16px] font-bold text-white">{t("game.you")}</span>
          </div>
          <span className="pb-8 font-display text-[22px] font-black italic text-white/70">VS</span>
          <div className="flex flex-col items-center gap-2">
            <QuizPlayerAvatar avatarUrl={triviaKingAvatar} size="large" score={mascotScore} state={outcome === "lose" ? "correct" : outcome === "win" ? "wrong" : "default"} />
            <span className="font-display text-[16px] font-bold text-white">{t("extra.duelOpponent")}</span>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-white/70">{t("extra.quizCorrectAnswers", { score: correct, total })}</p>

        {/* The stake, as it actually moved. Nothing on a draw, or while the
            server has not answered, or when it declined (an empty balance,
            a daily ceiling). */}
        {!saving && delta !== null && delta !== 0 && (
          <div className="mt-5">
            <CoinDeltaPill delta={delta} />
          </div>
        )}
        {saving && <p className="mt-5 text-sm text-white/70">{t("extra.quizSavingProgress")}</p>}

        {/* The same two ends as every results screen: the green "Play
            again", and under it a text button for the way out. The way out
            used to be an outlined purple button on a purple screen, which
            read as nothing (owner: "make sure buttons are visible and they
            are same styled"). */}
        <div className="mt-8 w-full">
          <ChunkyButton variant="mint" size="lg" className="w-full" onClick={onPlayAgain} disabled={saving} icon={<RotateCcw className="h-5 w-5" />}>
            {t("game.playAgain")}
          </ChunkyButton>
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="mx-auto mt-1 flex items-center gap-2 py-3 text-sm font-bold text-white/80 hover:text-white disabled:opacity-60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("extra.duelBackToGuess")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
