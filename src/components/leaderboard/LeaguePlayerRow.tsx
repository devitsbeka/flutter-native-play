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

// Rank badge colors matching Duolingo
const RANK_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-yellow-400", text: "text-yellow-900" },
  2: { bg: "bg-gray-300", text: "text-gray-700" },
  3: { bg: "bg-amber-600", text: "text-amber-100" },
};

// Generate consistent avatar colors based on name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-pink-400",
    "bg-blue-400", 
    "bg-green-400",
    "bg-purple-400",
    "bg-orange-400",
    "bg-teal-400",
    "bg-red-400",
    "bg-indigo-400",
  ];
  const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function LeaguePlayerRow({
  entry,
  isCurrentUser,
  index,
  previousRank,
  shouldAnimate,
}: LeaguePlayerRowProps) {
  const rankStyle = RANK_COLORS[entry.rank];
  const isTopThree = entry.rank <= 3;

  // Calculate animation offset based on rank change
  const rankDiff = previousRank && shouldAnimate ? previousRank - entry.rank : 0;
  const rowHeight = 72;
  const initialOffset = rankDiff * rowHeight;

  return (
    <motion.div
      className={`flex items-center gap-4 py-3 px-2 rounded-2xl transition-colors ${
        isCurrentUser
          ? "bg-emerald-500/10 border-2 border-emerald-500/30"
          : "hover:bg-muted/30"
      }`}
      initial={
        shouldAnimate && rankDiff !== 0 
          ? { y: initialOffset, opacity: 0.8, scale: 0.98 } 
          : { opacity: 0, x: -20 }
      }
      animate={{ y: 0, opacity: 1, x: 0, scale: 1 }}
      transition={
        shouldAnimate && rankDiff !== 0
          ? {
              type: "spring",
              stiffness: 80,
              damping: 15,
              delay: 0.8,
            }
          : {
              delay: index * 0.03,
              duration: 0.3,
            }
      }
      layout
    >
      {/* Rank Badge */}
      <div className="w-10 flex justify-center shrink-0">
        {isTopThree && rankStyle ? (
          <motion.div
            className={`w-8 h-8 rounded-full ${rankStyle.bg} flex items-center justify-center font-bold text-sm shadow-md ${rankStyle.text}`}
            animate={
              isCurrentUser && shouldAnimate
                ? { scale: [1, 1.2, 1] }
                : {}
            }
            transition={{ delay: 1.5, duration: 0.3 }}
          >
            {entry.rank}
          </motion.div>
        ) : (
          <span className="text-muted-foreground font-bold text-lg">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className={`h-12 w-12 border-2 ${isCurrentUser ? "border-emerald-500" : "border-border"}`}>
          <AvatarImage src={entry.avatar_url || undefined} alt={entry.nickname} />
          <AvatarFallback className={`${getAvatarColor(entry.nickname)} text-white font-bold text-lg`}>
            {entry.nickname?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-base truncate ${
            isCurrentUser ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          }`}
        >
          {entry.nickname}
        </p>
      </div>

      {/* XP */}
      <motion.div
        className="text-right shrink-0"
        animate={
          isCurrentUser && shouldAnimate
            ? { scale: [1, 1.1, 1] }
            : {}
        }
        transition={{ delay: 1.6, duration: 0.3 }}
      >
        <span className={`font-bold text-base ${isCurrentUser ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
          {entry.weekly_xp.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-sm ml-1">XP</span>
      </motion.div>
    </motion.div>
  );
}
