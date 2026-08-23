import { motion } from "framer-motion";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

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

/** How many avatars the strip will carry before deferring to the results screen. */
export const MAX_SHOWN = 10;

/** Ring, medal and glow per place. Fourth onward gets none of it. */
const PODIUM = [
  { ring: "#F5B921", glow: "rgba(245,185,33,0.55)", medal: medalGold },
  { ring: "#C3CEDA", glow: "rgba(195,206,218,0.5)", medal: medalSilver },
  { ring: "#D08A4F", glow: "rgba(208,138,79,0.5)", medal: medalBronze },
] as const;

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

  // Ten is the ceiling. Past that the row is scrolling further than anyone
  // will scroll mid-question, and the full field is on the results screen,
  // which is a vertical list and has room for it.
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
  const sideways = ranked.length <= 3;

  return (
    <div
      className={cn(
        "flex overflow-x-auto scrollbar-hide px-4 py-0.5 -mx-4",
        sideways ? "items-center gap-5 justify-center" : "items-start gap-2",
        // Centre a field small enough to fit; longer ones start at first place
        // and scroll, so the leader is always the one you see first.
        !sideways && (ranked.length <= 4 ? "justify-center" : "justify-start"),
        className,
      )}
    >
      {ranked.map((player, index) => {
        const podium = index < PODIUM.length ? PODIUM[index] : null;
        const isMe = !!currentUserId && player.user_id === currentUserId;
        const score = Math.round(player.score || 0);

        return (
          <motion.div
            key={player.id}
            // layout is what makes an overtake readable: the element keeps its
            // identity and travels to its new place.
            layout
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className={cn(
              "flex shrink-0",
              sideways
                ? "items-center gap-1.5"
                : cn(
                    "flex-col items-center gap-0.5",
                    // The podium is drawn bigger than the rest. A full room is
                    // ten players and they cannot all fit across a phone, so
                    // the three that matter hold the left edge at full size
                    // and the chasing pack is narrower behind them.
                    podium ? "w-[64px]" : "w-[52px]",
                  ),
            )}
          >
            <div className="relative">
              <div
                className="rounded-full p-[2.5px]"
                style={{
                  background: podium?.ring ?? "rgba(255,255,255,0.28)",
                  boxShadow: podium ? `0 0 10px ${podium.glow}` : undefined,
                }}
              >
                <SmartAvatar
                  avatarUrl={player.avatar_url ?? undefined}
                  fallback={player.nickname}
                  size={sideways || podium ? "sm" : "xs"}
                />
              </div>

              {podium && (
                <img
                  src={podium.medal}
                  alt=""
                  className="absolute -bottom-1 -right-1 h-[15px] w-[15px] object-contain drop-shadow"
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
              <span
                className={cn(
                  "min-w-0 truncate font-semibold leading-none text-white",
                  sideways ? "text-[11px]" : "text-[10px]",
                  isMe ? "font-extrabold" : "text-white/90",
                )}
              >
                {isMe ? t("game.you") : player.nickname}
              </span>
              <motion.span
                key={score}
                initial={{ scale: 1.35, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "shrink-0 font-display font-extrabold leading-none text-white drop-shadow-sm",
                  sideways ? "text-[13px]" : "text-[11px]",
                )}
              >
                {score}
              </motion.span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
