import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeagueEntry } from "@/hooks/useLeagueLeaderboard";

interface LeaguePlayerRowProps {
  entry: LeagueEntry;
  isCurrentUser: boolean;
  index: number;
  previousRank?: number | null;
  shouldAnimate?: boolean;
}

const RANK_COLORS: Record<number, string> = {
  1: "bg-yellow-500",
  2: "bg-gray-400",
  3: "bg-amber-600",
};

export function LeaguePlayerRow({
  entry,
  isCurrentUser,
  index,
  previousRank,
  shouldAnimate,
}: LeaguePlayerRowProps) {
  const rankColor = RANK_COLORS[entry.rank];
  const isTopThree = entry.rank <= 3;

  // Calculate animation offset based on rank change
  const rankDiff = previousRank && shouldAnimate ? previousRank - entry.rank : 0;
  const rowHeight = 64; // Approximate row height in pixels
  const initialOffset = rankDiff * rowHeight;

  return (
    <motion.div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/30"
      }`}
      initial={shouldAnimate && rankDiff !== 0 ? { y: initialOffset, opacity: 0.8 } : { opacity: 0, x: -20 }}
      animate={{ y: 0, opacity: 1, x: 0 }}
      transition={
        shouldAnimate && rankDiff !== 0
          ? {
              type: "spring",
              stiffness: 80,
              damping: 15,
              delay: 0.8,
            }
          : {
              delay: index * 0.05,
              duration: 0.3,
            }
      }
      layout
    >
      {/* Rank Badge */}
      <div className="w-8 flex justify-center">
        {isTopThree ? (
          <motion.div
            className={`w-7 h-7 rounded-full ${rankColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}
            animate={
              isCurrentUser && shouldAnimate
                ? {
                    scale: [1, 1.2, 1],
                  }
                : {}
            }
            transition={{ delay: 1.5, duration: 0.3 }}
          >
            {entry.rank}
          </motion.div>
        ) : (
          <span className="text-muted-foreground font-medium">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 border-2 border-border">
        <AvatarImage src={entry.avatar_url || undefined} alt={entry.nickname} />
        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
          {entry.nickname?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium truncate ${
            isCurrentUser ? "text-primary" : "text-foreground"
          }`}
        >
          {entry.nickname}
        </p>
      </div>

      {/* XP */}
      <motion.div
        className="text-right"
        animate={
          isCurrentUser && shouldAnimate
            ? {
                scale: [1, 1.1, 1],
              }
            : {}
        }
        transition={{ delay: 1.6, duration: 0.3 }}
      >
        <span className="font-bold text-foreground">{entry.weekly_xp}</span>
        <span className="text-muted-foreground text-sm ml-1">XP</span>
      </motion.div>

      {/* Current user glow effect */}
      {isCurrentUser && shouldAnimate && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-primary/5 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ delay: 1.5, duration: 1 }}
        />
      )}
    </motion.div>
  );
}
