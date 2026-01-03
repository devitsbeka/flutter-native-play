import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, User, Star, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { useCategoryLeaderboard } from "@/hooks/useCategoryLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ChunkyButton } from "@/components/ui/chunky-button";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

interface CategoryLeaderboardProps {
  categoryId: string;
  categoryName: string;
  onPlay: () => void;
  lightMode?: boolean;
}

export function CategoryLeaderboard({
  categoryId,
  categoryName,
  onPlay,
  lightMode = false,
}: CategoryLeaderboardProps) {
  const { user } = useAuth();
  const { leaderboard, isLoading, userRank } = useCategoryLeaderboard(categoryId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <img src={medalGold} alt="1st" className="w-8 h-8 object-contain" />;
      case 2:
        return <img src={medalSilver} alt="2nd" className="w-8 h-8 object-contain" />;
      case 3:
        return <img src={medalBronze} alt="3rd" className="w-8 h-8 object-contain" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    // Base styles for top 3
    const baseStyles = {
      1: {
        background: "linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)",
        border: "3px solid #A855F7",
        boxShadow: "0 2px 8px rgba(168, 85, 247, 0.3)",
      },
      2: {
        background: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
        border: "2px solid #60A5FA",
        boxShadow: "0 2px 8px rgba(96, 165, 250, 0.3)",
      },
      3: {
        background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
        border: "2px solid #FBBF24",
        boxShadow: "0 2px 8px rgba(251, 191, 36, 0.3)",
      },
    };

    if (rank >= 1 && rank <= 3) {
      const style = baseStyles[rank as 1 | 2 | 3];
      // Add current user ring if needed
      if (isCurrentUser) {
        return {
          ...style,
          boxShadow: `${style.boxShadow}, 0 0 0 3px rgba(139, 92, 246, 0.4)`,
        };
      }
      return style;
    }

    return lightMode
      ? { background: "rgba(255,255,255,0.6)", border: "1px solid #E2E8F0" }
      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Play Button Area */}
      <div className="mb-6">
        <ChunkyButton
          onClick={onPlay}
          className="w-full"
          size="lg"
          variant="mint"
          icon={<Play className="h-5 w-5 fill-current" />}
        >
          ითამაშე
        </ChunkyButton>

        {/* User's Current Position */}
        {user && userRank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-2xl border ${
              lightMode 
                ? "bg-primary/10 border-primary/30" 
                : "bg-primary/10 border-primary/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  lightMode ? "bg-primary/20" : "bg-primary/20"
                }`}>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>შენი პოზიცია</p>
                  <p className={`text-xl font-bold ${lightMode ? "text-slate-800" : "text-white"}`}>#{userRank.rank}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>ვარსკვლავები</p>
                <div className="flex items-center gap-1 justify-end">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <p className="text-xl font-bold text-amber-500">{userRank.total_stars}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {user && !userRank && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-2xl border text-center ${
              lightMode 
                ? "bg-white/60 border-slate-200" 
                : "bg-white/5 border-white/10"
            }`}
          >
            <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>
              ითამაშე რათა გამოჩნდე ლიდერბორდზე!
            </p>
          </motion.div>
        )}
      </div>

      {/* Leaderboard Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className={`text-lg font-bold ${lightMode ? "text-slate-800" : "text-white"}`}>ლიდერბორდი</h3>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 pb-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className={`h-12 w-12 mx-auto mb-3 ${lightMode ? "text-slate-300" : "text-white/20"}`} />
            <p className={lightMode ? "text-slate-500" : "text-white/50"}>ჯერ არავინ არ ითამაშა</p>
            <p className={`text-sm mt-1 ${lightMode ? "text-slate-400" : "text-white/30"}`}>იყავი პირველი!</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = user?.id === entry.user_id;
                const hasRankChange = entry.rankChange;
                
                return (
                  <motion.div
                    key={entry.user_id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      scale: hasRankChange ? [1, 1.02, 1] : 1,
                    }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ 
                      delay: hasRankChange ? 0 : index * 0.03,
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      scale: { duration: 0.3 }
                    }}
                    className={`p-4 rounded-xl flex items-center gap-3 relative overflow-hidden ${
                      hasRankChange ? "ring-2 ring-offset-1 ring-offset-transparent" : ""
                    } ${
                      hasRankChange === "up" ? "ring-emerald-400/50" : 
                      hasRankChange === "down" ? "ring-rose-400/50" : 
                      hasRankChange === "new" ? "ring-amber-400/50" : ""
                    }`}
                    style={getRankStyle(entry.rank, isCurrentUser)}
                  >
                    {/* Rank change indicator */}
                    {hasRankChange && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className={`absolute -right-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                          hasRankChange === "up" ? "bg-emerald-500" : 
                          hasRankChange === "down" ? "bg-rose-500" : 
                          "bg-amber-500"
                        }`}
                      >
                        {hasRankChange === "up" && <TrendingUp className="h-3 w-3 text-white" />}
                        {hasRankChange === "down" && <TrendingDown className="h-3 w-3 text-white" />}
                        {hasRankChange === "new" && <Sparkles className="h-3 w-3 text-white" />}
                      </motion.div>
                    )}

                    {/* Shine animation for rank changes */}
                    {hasRankChange === "up" && (
                      <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "200%", opacity: [0, 0.5, 0] }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent skew-x-12"
                      />
                    )}

                    {/* Rank */}
                    <motion.div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        lightMode ? "bg-slate-200/80" : "bg-white/10"
                      }`}
                      animate={hasRankChange ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {getRankIcon(entry.rank) || (
                        <span className={`text-sm font-bold ${lightMode ? "text-slate-600" : "text-white/70"}`}>{entry.rank}</span>
                      )}
                    </motion.div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      lightMode ? "bg-slate-200/80" : "bg-white/10"
                    }`}>
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.nickname}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className={`h-5 w-5 ${lightMode ? "text-slate-400" : "text-white/50"}`} />
                      )}
                    </div>

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${
                        isCurrentUser ? "text-primary" : lightMode ? "text-slate-800" : "text-white"
                      }`}>
                        {entry.nickname}
                        {isCurrentUser && " (შენ)"}
                      </p>
                      <p className={`text-xs ${lightMode ? "text-slate-500" : "text-white/50"}`}>
                        {entry.levels_completed} დონე დასრულებული
                      </p>
                    </div>

                    {/* Stars */}
                    <motion.div 
                      className="text-right flex items-center gap-1"
                      animate={hasRankChange ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <p className={`font-bold ${
                        entry.rank === 1 ? "text-emerald-700" : 
                        entry.rank === 2 ? "text-blue-700" :
                        entry.rank === 3 ? "text-amber-700" :
                        lightMode ? "text-slate-700" : "text-white"
                      }`}>
                        {entry.total_stars}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show user's position if not in top 100 */}
            {user && userRank && userRank.rank > 100 && (
              <>
                <div className="flex items-center gap-2 py-2">
                  <div className={`flex-1 h-px ${lightMode ? "bg-slate-200" : "bg-white/10"}`} />
                  <span className={`text-xs ${lightMode ? "text-slate-400" : "text-white/30"}`}>...</span>
                  <div className={`flex-1 h-px ${lightMode ? "bg-slate-200" : "bg-white/10"}`} />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl border bg-primary/20 border-primary/40 ring-2 ring-primary/30 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    lightMode ? "bg-slate-200/80" : "bg-white/10"
                  }`}>
                    <span className={`text-sm font-bold ${lightMode ? "text-slate-600" : "text-white/70"}`}>{userRank.rank}</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    lightMode ? "bg-slate-200/80" : "bg-white/10"
                  }`}>
                    <User className={`h-5 w-5 ${lightMode ? "text-slate-400" : "text-white/50"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary truncate">შენ</p>
                    <p className={`text-xs ${lightMode ? "text-slate-500" : "text-white/50"}`}>{userRank.levels_completed} დონე</p>
                  </div>
                  <div className="text-right flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <p className={`font-bold ${lightMode ? "text-slate-700" : "text-white"}`}>{userRank.total_stars}</p>
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
