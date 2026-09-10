/**
 * The Guess card's versus screen: Trivia King, the wheel, and you.
 *
 * The Guess card used to ask a question — "what will you guess?" — on a
 * grid of picture games, and then, on the level page, show a second screen
 * with the King's face and the pot. The owner wants the quick game's
 * versus screen here instead (Figma 1147:8835): the opponent top-left, the
 * category plate across the middle with the wheel spinning inside it, the
 * player bottom-right, one Play. Two things differ from the quick game, by
 * the owner's word:
 *
 *  - the opponent is Trivia King, at once. No slot machine over the
 *    avatar, no level, no coins — the King's face (Figma 1173:11905) and
 *    his name, and nothing under it;
 *  - the wheel spins the PICTURE games only — flag, logo, celebrity, movie,
 *    city, sportsman — and lands on the one the player will guess. Three
 *    free re-rolls, as the quick game gives.
 *
 * (owner: "show this screen (quick game screen) on guess game screen too,
 * show this avatar for Trivia King avatar instantly and instead choosing
 * what to guess show this randomizer to pick what will be the guess game
 * flag, logo or other, trivia king has no levels or coins just trivia
 * king with this avatar").
 *
 * The plate, the frame colour, the watermark and the two cards are the
 * quick game's own (VSScreen exports the plate and the colour), so the
 * two screens cannot drift apart.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { CategoryPlate, VS_PURPLE } from "@/components/game/VSScreen";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateLevel } from "@/utils/levelCalculation";
import { REWARDS } from "@/config/rewardConfig";
import triviaKingAvatar from "@/assets/trivia-king.png";
import defaultGuestAvatar from "@/assets/guest-avatar.png";

export interface GuessCategory {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

/** How the wheel slows: the quick game's own cadence (VSScreen). */
const WHEEL_CYCLES = 12;
const wheelDelay = (count: number): number => {
  if (count < 6) return 60;
  if (count < 9) return 120;
  if (count < 11) return 200;
  return 350;
};
/** Three free re-rolls, as the quick game gives. */
const FREE_SPINS = 3;

interface GuessVersusScreenProps {
  categories: GuessCategory[];
  onPlay: (category: GuessCategory) => void;
  onBack: () => void;
  /** The round is being set up: Play waits, and says so. */
  busy?: boolean;
}

export function GuessVersusScreen({ categories, onPlay, onBack, busy = false }: GuessVersusScreenProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const playerLevel = calculateLevel(profile?.total_points || 0).level;
  const playerCoins = profile?.coins || 0;

  // The wheel: an index into the games, rolling, then still.
  const [wheelIndex, setWheelIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(FREE_SPINS);
  const [spinKey, setSpinKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (categories.length === 0) return;
    setLocked(false);
    let count = 0;
    const roll = () => {
      count += 1;
      setWheelIndex(Math.floor(Math.random() * categories.length));
      if (count < WHEEL_CYCLES) {
        timer.current = setTimeout(roll, wheelDelay(count));
      } else {
        setLocked(true);
      }
    };
    timer.current = setTimeout(roll, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [categories.length, spinKey]);

  const spin = useCallback(() => {
    if (spinsLeft <= 0 || !locked) return;
    setSpinsLeft((n) => n - 1);
    setSpinKey((k) => k + 1);
  }, [spinsLeft, locked]);

  const category = categories[wheelIndex];
  const ready = locked && !!category && !busy;

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden safe-bleed" style={{ background: VS_PURPLE }}>
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto relative overflow-hidden">
        {/* VS watermark — the quick game's (Figma 1147:8834). */}
        <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
          <span className="font-slackey text-[180px] leading-[180px] tracking-[-9px] text-white/[0.06] select-none -translate-x-[42px] translate-y-[20px]">
            VS
          </span>
        </div>

        {/* Header: the way back, and nothing else. */}
        <motion.div
          className="flex items-center justify-between px-4 pt-4 pb-2 relative z-30 shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.button type="button" onClick={onBack} className="p-2" aria-label={t("common.back")} whileTap={{ scale: 0.95 }}>
            <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
          </motion.button>
        </motion.div>

        <div className="flex-1 min-h-0 relative z-10 px-5">
          {/* Trivia King — upper left, at once. His face and his name; no
              level, no coins (owner: "trivia king has no levels or coins"). */}
          <motion.div
            className="absolute left-5 right-5 top-[25.1%] flex justify-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 pl-[7%]">
              <motion.div
                className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.12, 0.97, 1] }}
                transition={{ duration: 0.45, times: [0, 0.35, 0.7, 1], ease: "easeOut", delay: 0.3 }}
              >
                <SmartAvatar avatarUrl={triviaKingAvatar} fallback="K" size="2xl" autoPlay={false} showSparkle={false} />
              </motion.div>
              <h3 className="font-slackey text-[28px] leading-[28px] text-white tracking-[-0.16px] truncate">
                {t("extra.duelOpponent")}
              </h3>
            </div>
          </motion.div>

          {/* The wheel, in the plate — the picture games only. */}
          <motion.div
            className="absolute left-5 right-5 top-[45.6%]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: category ? 1 : 0, scale: category ? 1 : 0.85 }}
            transition={{ duration: 0.4 }}
          >
            <CategoryPlate
              name={category?.name ?? ""}
              iconSlug={category?.icon_slug ?? undefined}
              isLocked={locked}
              stake={REWARDS.GUESS_STAKE}
              canSpin={locked && spinsLeft > 0 && !busy}
              onSpin={spin}
              spinLabel={t("extra.spinCategoryBtn", { count: spinsLeft })}
            />
          </motion.div>

          {/* You — lower right, as on the quick game. */}
          <motion.div
            className="absolute left-5 right-5 top-[68.3%] flex justify-end"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end text-right min-w-0">
                <h3 className="font-slackey text-[28px] leading-[28px] text-white tracking-[-0.16px] truncate">
                  {profile?.nickname || t("game.you")}
                </h3>
                <p className="text-white/70 text-sm leading-5 tracking-[-0.16px]">
                  {t("common.level")} {playerLevel}
                </p>
                <p className="text-[#FCD34D] text-sm leading-5 font-medium tracking-[-0.16px]">
                  {playerCoins.toLocaleString()}
                </p>
              </div>
              <div className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <SmartAvatar
                  avatarUrl={profile?.avatar_url || defaultGuestAvatar}
                  animatedAvatarUrl={profile?.animated_avatar_url}
                  fallback={profile?.nickname?.charAt(0) || "?"}
                  size="2xl"
                  autoPlay={false}
                  showSparkle={false}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Play — the quick game's button, 33pt off the bottom edge. */}
        <div className="w-full px-5 pb-[33px] pt-2 relative z-20 shrink-0">
          <motion.div
            className="w-full max-w-[395px] mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: locked ? 1 : 0, y: locked ? 0 : 20 }}
            transition={{ duration: 0.3 }}
          >
            <ChunkyButton
              variant="mintBright"
              size="xl"
              onClick={() => category && onPlay(category)}
              disabled={!ready}
              className="w-full h-[63px] py-0 rounded-[18.39px] font-display text-[18px]"
            >
              {busy ? t("common.loading") : t("extra.roomPlay")}
            </ChunkyButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
