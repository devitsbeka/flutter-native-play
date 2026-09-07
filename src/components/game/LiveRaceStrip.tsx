import { Fragment } from "react";
import { motion } from "framer-motion";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useIsBreakpointUp } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

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
 * Three on the podium, then whoever fits behind them.
 *
 * Seven on a tablet or a desktop, two on a phone. Ten avatars and their
 * scores need about 390pt of the 390 a phone has, which is the whole width
 * with nothing to spare -- and it is spent on seven entries a player cannot
 * read anyway, since at that size each one is a 28px circle and a number.
 * Five leaves room to draw them properly and to put the names back.
 *
 * Past the cut the full field is on the results screen, which is a vertical
 * list and has room for all of it.
 */
const PODIUM_SHOWN = 3;
const PACK_SHOWN = 7;
const PACK_SHOWN_NARROW = 2;
export const MAX_SHOWN = PODIUM_SHOWN + PACK_SHOWN;

/**
 * At five or fewer each entry can be drawn at full size. At six and up the
 * three that matter hold the left edge and the chasing pack is compact behind
 * them, because ten of anything wider does not cross a phone.
 *
 * This is a count, not a breakpoint, so a four-player room looks the same on
 * a phone as on a desktop.
 */
const ROOMY_UP_TO = 5;

/**
 * The ring per place. Fourth onward gets the plain one.
 *
 * The ring is now the ONLY thing that says who is winning. The strip used to
 * hang a gold, silver or bronze trophy on the podium avatars as well, which
 * said the same thing twice — and said it over the picture, since the badge
 * sat on the rim of a 32px circle (owner's ask: avatars and points, nothing
 * else).
 */
const PODIUM = [
  { ring: "#F5B921" },
  { ring: "#C3CEDA" },
  { ring: "#D08A4F" },
] as const;

/**
 * Everyone off the podium wears the same plain ring.
 *
 * SELF_RING is drawn OUTSIDE whichever ring the place gives, not instead of
 * it. It used to be an either/or, which was fine while every entry carried a
 * name — "You" answered it. With the names gone a player in the top three
 * would have had no way at all to tell which avatar was theirs, because their
 * ring would be the podium colour like anyone else's.
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
 * A face and a number, and nothing else (owner's ask). The names and the
 * podium trophies are gone: a name at 10px truncates to "Sal…" and identifies
 * nobody, and a trophy on the rim of a 32px circle covers the one thing the
 * entry is for while repeating what the ring already says.
 *
 * The order is the point. Every entry animates its own position, so
 * overtaking someone is a thing you watch happen — the avatar slides left
 * into the gold ring as the score lands, rather than the table being
 * different the next time you open it.
 */
export function LiveRaceStrip({ players, currentUserId, className }: LiveRaceStripProps) {
  const wide = useIsBreakpointUp("md");

  if (players.length < 2) return null;

  const ranked = rankPlayers(players).slice(
    0,
    PODIUM_SHOWN + (wide ? PACK_SHOWN : PACK_SHOWN_NARROW),
  );
  const roomy = ranked.length <= ROOMY_UP_TO;

  /**
   * Two or three players sit sideways -- avatar, then score beside it --
   * which is shorter than the stacked version and lets the score be bigger.
   * Four or more would scroll sideways at that width, so they stack instead
   * and stay visible at a glance.
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
        // py-1.5 rather than py-0.5: the rings are box-shadows, which are
        // painted OUTSIDE the element's box and take no layout space. Your
        // own avatar carries two of them, 4px out — more than the 2px this
        // row used to reserve — so the bright ring spilled past the strip
        // and sat against the top of the question card.
        "flex overflow-x-auto scrollbar-hide px-4 py-1.5 -mx-4",
        sideways
          ? "items-center justify-center gap-5"
          : "items-start justify-center gap-[3px]",
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
              // Capped, and the row centres. Uncapped on a 1024px desktop it
              // pins the podium to the far left and the pack to the far
              // right with half a screen of nothing between them, which is
              // not a race, it is two separate widgets.
              <div className="min-w-[10px] max-w-[140px] flex-1" aria-hidden />
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
                      // 72px here used to be a name's slot. Without one the
                      // entry is an avatar over a number, and the extra
                      // 26px was empty space that pushed a five-player row
                      // wider than it needed to be. 40px holds a 32px face
                      // and the 4px ring on either side of it exactly.
                      roomy || podium ? "w-[40px]" : "w-[30px]",
                    ),
              )}
            >
              {/* A spread box-shadow, not a padded parent. The ring used to
                  be a coloured div with 2.5px of padding, which rounds to
                  whole pixels unevenly at this size and left the stroke
                  visibly heavier along the bottom. A shadow of zero offset
                  and zero blur is the same 2px the whole way round.
                  
                  No wrapper around it any more: the only reason for one was
                  anchoring the trophy that used to hang off the rim. */}
              <SmartAvatar
                avatarUrl={player.avatar_url ?? undefined}
                fallback={player.nickname}
                // xs (32px), not sm (40). At 40 with a 4px ring the entry
                // stood 48px tall in a header that sits directly above the
                // question card, and the two touched (owner's ask: reduce
                // them). The face is still the biggest thing in the row.
                size="xs"
                // 24px for the chasing pack, not the 32 xs gives. Three
                // podium entries and seven more have to cross a tablet
                // without the tail of the field falling off the right
                // edge, and those pixels are the difference.
                className={cn(
                  "rounded-full",
                  !sideways && !roomy && !podium && "h-6 w-6",
                )}
                style={{
                  // Place first, then you around it. Two spread shadows
                  // rather than one: a podium ring used to REPLACE the self
                  // ring, which was survivable while a name said "You" and
                  // is not now.
                  boxShadow: [
                    `0 0 0 2px ${podium?.ring ?? PACK_RING}`,
                    isMe ? `0 0 0 4px ${SELF_RING}` : null,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }}
              />

              {/* Just the score. The name that used to sit beside it is gone
                  (owner's ask): at 10px it truncated to nothing readable, and
                  the ring above answers "which one am I" for the only person
                  who needs to ask. The score still animates its own change,
                  so an overtake is readable. */}
              <div className="flex min-w-0 max-w-full items-baseline justify-center">
                <motion.span
                  key={score}
                  initial={{ scale: 1.35, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "shrink-0 font-display font-extrabold leading-none drop-shadow-sm",
                    sideways ? "text-[13px]" : "text-[12px]",
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
