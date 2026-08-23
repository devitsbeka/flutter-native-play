import { Fragment } from "react";
import { motion } from "framer-motion";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import trophyGold from "@/assets/trophy-gold.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyBronze from "@/assets/trophy-bronze.png";

export interface RacePlayer {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  score: number | null;
  /** Tie-break, so equal scores hold a stable order instead of jittering. */
  joined_at?: string;
}

interface LiveRaceStripProps {
  players: RacePlayer[];
  currentUserId?: string;
  className?: string;
}

/**
 * Three on the podium, seven chasing. Past ten the row is scrolling further
 * than anyone will scroll mid-question, and the full field is on the results
 * screen, which is a vertical list and has room for it.
 */
const PODIUM_SHOWN = 3;
const PACK_SHOWN = 7;
export const MAX_SHOWN = PODIUM_SHOWN + PACK_SHOWN;

/** Ring and trophy per place. Fourth onward gets neither. */
const PODIUM = [
  { ring: "#F5B921", trophy: trophyGold },
  { ring: "#C3CEDA", trophy: trophySilver },
  { ring: "#D08A4F", trophy: trophyBronze },
] as const;

/**
 * Everyone off the podium wears the same plain ring — except you, who wear a
 * bright one. Names do not survive a ten-player row (see below), so the ring
 * is what answers "which one am I".
 */
const PACK_RING = "rgba(255,255,255,0.32)";
const SELF_RING = "rgba(255,255,255,0.95)";

/**
 * Standings, highest first.
 *
 * The tie-break is not decoration. Everyone starts on nothing, and a sort
 * that leaves equal scores to the engine lets the whole strip reshuffle on
 * any re-render — avatars swapping places while nobody has scored, which
 * reads as the race lying. Join order is stable and already known to every
 * client, so equal scores hold their positions until a score actually
 * separates them.
 */
export function rankPlayers<T extends RacePlayer>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    const diff = (b.score || 0) - (a.score || 0);
    if (diff !== 0) return diff;
    return (a.joined_at || "").localeCompare(b.joined_at || "");
  });
}

/**
 * Who is winning, while the round is still being played.
 *
 * The standings existed only behind a collapsed toggle and on the results
 * screen, so for the length of a round nobody could see the race they were
 * in. This puts it across the top: first place on the left, everyone else in
 * order after them, each with their score under their avatar.
 *
 * The order is the point. Every entry animates its own position, so
 * overtaking someone is a thing you watch happen — the avatar slides left
 * into the gold ring as the score lands, rather than the table being
 * different the next time you open it.
 */
export function LiveRaceStrip({ players, currentUserId, className }: LiveRaceStripProps) {
  const { t } = useLanguage();

  if (players.length < 2) return null;

  const ranked = rankPlayers(players).slice(0, MAX_SHOWN);

  /**
   * Two or three players sit sideways -- avatar, then name over score beside
   * it -- which is 46px tall against 63 for the stacked version, with a
   * bigger name and a bigger score. Four or more would scroll sideways at
   * that width, so they stack instead and stay visible at a glance.
   *
   * Height is the whole reason for the choice. This row is a header above the
   * question card and the four answers, and it began life at 93px with a
   * 32px answered-count row under it. That is 125px taken off the bottom of
   * the screen, which is where the fourth answer was being clipped by the
   * next-question button.
   */
  const sideways = ranked.length <= PODIUM_SHOWN;

  return (
    <div
      className={cn(
        "flex overflow-x-auto scrollbar-hide px-4 py-0.5 -mx-4",
        sideways ? "items-center justify-center gap-5" : "items-start gap-[3px]",
        className,
      )}
    >
      {ranked.map((player, index) => {
        const podium = index < PODIUM.length ? PODIUM[index] : null;
        const isMe = !!currentUserId && player.user_id === currentUserId;
        const score = Math.round(player.score || 0);

        return (
          <Fragment key={player.id}>
            {/* The gap that splits the podium from the pack. A flex spacer
                rather than two separate rows on purpose: every avatar has to
                stay a sibling of every other one for `layout` below to animate
                an overtake. Move fourth place into its own container and
                React reparents it on the way to third, which unmounts and
                remounts the element — the avatar would pop into the bronze
                ring instead of sliding into it. */}
            {!sideways && index === PODIUM_SHOWN && (
              <div className="min-w-[10px] flex-1" aria-hidden />
            )}

            <motion.div
              // layout is what makes an overtake readable: the element keeps
              // its identity and travels to its new place.
              layout
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className={cn(
                "flex shrink-0",
                sideways
                  ? "items-center gap-1.5"
                  : cn(
                      "flex-col items-center gap-0.5",
                      // The podium is drawn bigger than the rest. A full room
                      // is ten players and they cannot all fit across a phone
                      // at one size, so the three that matter hold the left
                      // edge and the chasing pack is compact on the right.
                      podium ? "w-[46px]" : "w-[30px]",
                    ),
              )}
            >
              <div className="relative">
                {/* A spread box-shadow, not a padded parent. The ring used to
                    be a coloured div with 2.5px of padding, which rounds to
                    whole pixels unevenly at this size and left the stroke
                    visibly heavier along the bottom. A shadow of zero offset
                    and zero blur is the same 2px the whole way round. */}
                <SmartAvatar
                  avatarUrl={player.avatar_url ?? undefined}
                  fallback={player.nickname}
                  size={sideways || podium ? "sm" : "xs"}
                  // 28px for the chasing pack, not the 32 xs gives. Three
                  // podium entries and seven more have to cross a 390pt
                  // phone without the tail of the field falling off the
                  // right edge, and those four pixels are the difference.
                  className={cn("rounded-full", !sideways && !podium && "h-7 w-7")}
                  style={{
                    boxShadow: `0 0 0 2px ${podium?.ring ?? (isMe ? SELF_RING : PACK_RING)}`,
                  }}
                />

                {podium && (
                  <img
                    src={podium.trophy}
                    alt=""
                    // Sitting on the rim, not hanging below the box. A round
                    // avatar leaves its bounding box empty at the corner, so
                    // -2px puts the trophy over the ring and keeps it clear
                    // of the score on the line underneath.
                    className="absolute -bottom-0.5 -right-0.5 h-[19px] w-[19px] object-contain drop-shadow"
                  />
                )}
              </div>

              {/* Name and score on ONE line. Stacked, under a 44px avatar,
                  this row stood 93px tall and every one of those pixels came
                  out of the question card and the four answers below it — the
                  fourth was being clipped by the next-question button. The
                  score still animates its own change, so an overtake is
                  readable without the row being a scoreboard. */}
              <div
                className={cn(
                  "flex min-w-0",
                  sideways ? "flex-col gap-0.5" : "max-w-full items-baseline gap-1",
                )}
              >
                {/* Stacked, nobody is named. A ten-player row gives each entry
                    thirty-odd pixels beside its score, and a name in that
                    space renders as "Sal…", which identifies nobody — the
                    avatar does that job better, and the ring above says which
                    one is you. Two or three players have the room, so they
                    keep their names. */}
                {sideways && (
                  <span
                    className={cn(
                      "min-w-0 truncate font-semibold leading-none text-white",
                      sideways ? "text-[11px]" : "text-[10px]",
                      isMe ? "font-extrabold" : "text-white/90",
                    )}
                  >
                    {isMe ? t("game.you") : player.nickname}
                  </span>
                )}
                <motion.span
                  key={score}
                  initial={{ scale: 1.35, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "shrink-0 font-display font-extrabold leading-none drop-shadow-sm",
                    sideways ? "text-[13px]" : "text-[11px]",
                    isMe ? "text-white" : "text-white/90",
                  )}
                >
                  {score}
                </motion.span>
              </div>
            </motion.div>
          </Fragment>
        );
      })}
    </div>
  );
}
