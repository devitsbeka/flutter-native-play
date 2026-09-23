/**
 * The Guess card's versus screen: Trivia King, the category, and you.
 *
 * The Guess card used to ask a question — "what will you guess?" — on a
 * grid of picture games, and then, on the level page, show a second screen
 * with the King's face and the prize. The owner wants the quick game's
 * versus screen here instead (Figma 1147:8835): the opponent top-left, the
 * category plate across the middle picking the category, the
 * player bottom-right, one Play. Two things differ from the quick game, by
 * the owner's word:
 *
 *  - the opponent is Trivia King, at once. No search over the
 *    avatar, no level, no coins — the King's face (Figma 1173:11905) and
 *    his name, and nothing under it;
 *  - the plate picks from the PICTURE games only — flag, logo, celebrity,
 *    movie, city, sportsman — and settles on the one the player will
 *    guess. Three free shuffles, as the quick game gives.
 *
 * Nothing is staked: the plate's coin pill is what beating the King pays
 * (REWARDS.GUESS_WIN_REWARD), and losing to him costs nothing.
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

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { CategoryPlate, VS_PURPLE } from "@/components/game/VSScreen";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { calculateLevel } from "@/utils/levelCalculation";
import { REWARDS } from "@/config/rewardConfig";
import { popularCategoryIcon } from "@/config/popularImageCategories";
import triviaKingAvatar from "@/assets/trivia-king.png";
import defaultGuestAvatar from "@/assets/guest-avatar.png";

export interface GuessCategory {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

/*
 * How the category is picked: the plate shuffles (CategoryPlate.reel) for
 * SHUFFLE_SECONDS and settles on a random picture game — the plate's own
 * timing, shared with the quick game. It used to be a slot-machine reel;
 * see CategoryPlate for why it is not any more.
 */
/** The two cards' inset from their own edge of the screen, the same on both sides. */
const CARD_INSET = "px-[4%]";
/** Three free shuffles, as the quick game gives. */
const FREE_SHUFFLES = 3;

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

  // The pick: an index into the games, shuffling, then still.
  const [pickIndex, setPickIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [shufflesLeft, setShufflesLeft] = useState(FREE_SHUFFLES);
  const [shuffleKey, setShuffleKey] = useState(0);

  // Each shuffle draws the category now; the plate does the rest and says
  // when it has settled.
  useEffect(() => {
    if (categories.length === 0) return;
    setLocked(false);
    setPickIndex(Math.floor(Math.random() * categories.length));
  }, [categories.length, shuffleKey]);
  const landed = useCallback(() => setLocked(true), []);

  const shuffle = useCallback(() => {
    if (shufflesLeft <= 0 || !locked) return;
    setShufflesLeft((n) => n - 1);
    setShuffleKey((k) => k + 1);
  }, [shufflesLeft, locked]);

  const category = categories[pickIndex];
  const ready = locked && !!category && !busy;

  // The plate's items wear the picture their category card wears: the six
  // picture games ship a 3D icon of their own, and the icon-library slug
  // they carry is a generic stand-in (a magnifier for Guess the Logo).
  // CategoryArtwork makes the same choice for every card.
  const plateItems = useMemo(
    () => categories.map((c) => ({ name: c.name, iconSlug: c.icon_slug ?? undefined, iconUrl: popularCategoryIcon(c.category_id) ?? undefined })),
    [categories],
  );

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden safe-bleed" style={{ background: VS_PURPLE }}>
      <div className="w-full h-full flex flex-col max-w-[700px] mx-auto relative overflow-hidden">
        {/* VS watermark — the quick game's (Figma 1147:8834). */}
        <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
          <span className="font-slackey text-[225px] leading-[225px] tracking-[-11.25px] text-white/[0.06] select-none -translate-x-[52.5px] translate-y-[25px]">
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
              level, no coins (owner: "trivia king has no levels or coins").
              Higher than the quick game's block, and the player's lower, so
              the plate has room on both sides (owner: "move mascot avatar
              and players avatar little up and down to free space between");
              both cards CARD_INSET from their edge. */}
          <motion.div
            className="absolute left-5 right-5 top-[18%] flex justify-start"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className={`flex items-center gap-3 ${CARD_INSET}`}>
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

          {/* The category, in the plate — the picture games only. */}
          <motion.div
            className="absolute left-5 right-5 top-[45.6%]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: category ? 1 : 0, scale: category ? 1 : 0.85 }}
            transition={{ duration: 0.4 }}
          >
            <CategoryPlate
              name={category?.name ?? ""}
              iconSlug={category?.icon_slug ?? undefined}
              iconUrl={popularCategoryIcon(category?.category_id) ?? undefined}
              isLocked={locked}
              reward={REWARDS.GUESS_WIN_REWARD}
              canShuffle={locked && shufflesLeft > 0 && !busy}
              onShuffle={shuffle}
              shuffleLabel={t("playRewards.newCategory", { count: shufflesLeft })}
              reel={{ items: plateItems, target: pickIndex, turnKey: shuffleKey, onLanded: landed }}
            />
            {/* No rules line under the plate: it was there, narrow, and the
                owner asked for it gone ("remove description below"). The
                intro screen still explains the scoring. */}
          </motion.div>

          {/* You — lower right, as on the quick game. */}
          <motion.div
            className="absolute left-5 right-5 top-[74%] flex justify-end"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <div className={`flex items-center gap-3 ${CARD_INSET}`}>
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
