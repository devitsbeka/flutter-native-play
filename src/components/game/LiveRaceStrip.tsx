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

  const ranked = rankPlayers(players);

  return (
    <div
      className={cn(
        "flex items-start gap-3 overflow-x-auto scrollbar-hide px-4 py-1 -mx-4",
        // Centre a field small enough to fit; longer ones start at first place
        // and scroll, so the leader is always the one you see first.
        ranked.length <= 4 ? "justify-center" : "justify-start",
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
              "flex shrink-0 flex-col items-center gap-1",
              // The podium is drawn bigger than the rest. A full room is ten
              // players and they cannot all fit across a phone, so the three
              // that matter hold the left edge at full size and the chasing
              // pack is narrower behind them.
              podium ? "w-[62px]" : "w-[46px]",
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
                  size="md"
                  className={podium ? "h-11 w-11" : "h-8 w-8"}
                />
              </div>

              {podium && (
                <img
                  src={podium.medal}
                  alt=""
                  className="absolute -bottom-1 -right-1 h-[18px] w-[18px] object-contain drop-shadow"
                />
              )}
            </div>

            <span
              className={cn(
                "max-w-full truncate text-[10px] leading-none",
                isMe ? "font-bold text-white" : "text-white/70",
              )}
            >
              {isMe ? t("game.you") : player.nickname}
            </span>

            {/* The score is the thing that moves, so it gets its own change
                animation rather than only sliding with the avatar. */}
            <motion.span
              key={score}
              initial={{ scale: 1.35, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "font-display font-bold leading-none text-white",
                podium ? "text-sm" : "text-xs",
              )}
            >
              {score}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
