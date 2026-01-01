import { motion } from "framer-motion";
import { Trophy, Medal, Play, Crown, User } from "lucide-react";
import { useCategoryLeaderboard } from "@/hooks/useCategoryLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface CategoryLeaderboardProps {
  categoryId: string;
  categoryName: string;
  onPlay: () => void;
}

export function CategoryLeaderboard({
  categoryId,
  categoryName,
  onPlay,
}: CategoryLeaderboardProps) {
  const { user } = useAuth();
  const { leaderboard, isLoading, userRank } = useCategoryLeaderboard(categoryId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-amber-400 fill-amber-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-300" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-500/20 to-amber-400/10 border-amber-400/30";
      case 2:
        return "bg-gradient-to-r from-slate-400/20 to-slate-300/10 border-slate-300/30";
      case 3:
        return "bg-gradient-to-r from-amber-700/20 to-amber-600/10 border-amber-600/30";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Play Button Area */}
      <div className="mb-6">
        <ChunkyButton
          onClick={onPlay}
          className="w-full"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2 fill-current" />
          თამაშის დაწყება
        </ChunkyButton>

        {/* User's Current Position */}
        {user && userRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-white/60">შენი პოზიცია</p>
                  <p className="text-xl font-bold text-white">#{userRank.rank}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">ქულები</p>
                <p className="text-xl font-bold text-primary">{userRank.total_score.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        )}

        {user && !userRank && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <p className="text-white/60 text-sm">
              ითამაშე რათა გამოჩნდე ლიდერბორდზე!
            </p>
          </motion.div>
        )}
      </div>

      {/* Leaderboard Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">ლიდერბორდი</h3>
        <span className="text-sm text-white/50">• {categoryName}</span>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">ჯერ არავინ არ ითამაშა</p>
            <p className="text-white/30 text-sm mt-1">იყავი პირველი!</p>
          </div>
        ) : (
          <>
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user?.id === entry.user_id;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isCurrentUser
                      ? "bg-primary/20 border-primary/40 ring-2 ring-primary/30"
                      : getRankBackground(entry.rank)
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(entry.rank) || (
                      <span className="text-sm font-bold text-white/70">{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white/50" />
                    )}
                  </div>

                  {/* Name & Stats */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${
                      isCurrentUser ? "text-primary" : "text-white"
                    }`}>
                      {entry.nickname}
                      {isCurrentUser && " (შენ)"}
                    </p>
                    <p className="text-xs text-white/50">
                      {entry.games_played} თამაში
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className={`font-bold ${
                      entry.rank === 1 ? "text-amber-400" : 
                      entry.rank === 2 ? "text-slate-300" :
                      entry.rank === 3 ? "text-amber-600" :
                      "text-white"
                    }`}>
                      {entry.total_score.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40">ქულა</p>
                  </div>
                </motion.div>
              );
            })}

            {/* Show user's position if not in top 100 */}
            {user && userRank && userRank.rank > 100 && (
              <>
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">...</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl border bg-primary/20 border-primary/40 ring-2 ring-primary/30 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white/70">{userRank.rank}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <User className="h-5 w-5 text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary truncate">შენ</p>
                    <p className="text-xs text-white/50">შენი პოზიცია</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{userRank.total_score.toLocaleString()}</p>
                    <p className="text-xs text-white/40">ქულა</p>
                  </div>
                </motion.div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
