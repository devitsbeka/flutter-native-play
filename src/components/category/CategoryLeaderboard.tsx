import { motion, AnimatePresence } from "framer-motion";
import { Trophy, User, Star, TrendingUp, TrendingDown, Sparkles, Gift } from "lucide-react";
import { useCategoryLeaderboard } from "@/hooks/useCategoryLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyRewardsPreview } from "@/components/leaderboard/WeeklyRewardsPreview";
import { getDaysRemainingInWeek } from "@/config/leaderboardRewards";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";

interface CategoryLeaderboardProps {
  categoryId: string;
  categoryName: string;
  lightMode?: boolean;
}

export function CategoryLeaderboard({
  categoryId,
  categoryName,
  lightMode = false,
}: CategoryLeaderboardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
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
        // GOLD - warm golden gradient with 10% opacity border
        background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)",
        border: "3px solid rgba(245, 158, 11, 0.1)",
        boxShadow: "0 2px 8px rgba(245, 158, 11, 0.4)",
      },
      2: {
        // SILVER - cool gray gradient with 10% opacity border
        background: "linear-gradient(135deg, #F1F5F9 0%, #CBD5E1 100%)",
        border: "2px solid rgba(148, 163, 184, 0.1)",
        boxShadow: "0 2px 8px rgba(148, 163, 184, 0.4)",
      },
      3: {
        // BRONZE - warm copper/bronze gradient with 10% opacity border
        background: "linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)",
        border: "2px solid rgba(234, 88, 12, 0.1)",
        boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
      },
    };

    if (rank >= 1 && rank <= 3) {
      return baseStyles[rank as 1 | 2 | 3];
    }

    return lightMode
      ? { background: "rgba(255,255,255,0.6)", border: "1px solid #E2E8F0" }
      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  };

  return (
    <div className="flex flex-col h-full">
      {/* User's Current Position */}
      {user && userRank && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-2xl border"
          style={{
            background: lightMode ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.05)',
            borderColor: lightMode ? '#E2E8F0' : 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {getRankIcon(userRank.rank)}
              </div>
              <div>
                <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>{t('leaderboard.yourRank')}</p>
                <p className={`text-xl font-bold ${lightMode ? "text-slate-800" : "text-white"}`}>#{userRank.rank}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>{t('leaderboard.stars')}</p>
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
          className={`mb-4 p-4 rounded-2xl border text-center ${
            lightMode 
              ? "bg-white/60 border-slate-200" 
              : "bg-white/5 border-white/10"
          }`}
        >
          <p className={`text-sm ${lightMode ? "text-slate-500" : "text-white/60"}`}>
            {t('leaderboard.playToAppear')}
          </p>
        </motion.div>
      )}

      {/* Leaderboard Header with Rewards Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className={`text-lg font-bold ${lightMode ? "text-slate-800" : "text-white"}`}>{t('leaderboard.title')}</h3>
        </div>
        
        <WeeklyRewardsPreview 
          currentRank={userRank?.rank}
          lightMode={lightMode}
          trigger={
            <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${
              lightMode 
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            }`}>
              <Gift className="h-3.5 w-3.5" />
              <span>{getDaysRemainingInWeek()}დ</span>
            </button>
          }
        />
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 pb-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className={`h-12 w-12 mx-auto mb-3 ${lightMode ? "text-slate-300" : "text-white/20"}`} />
            <p className={lightMode ? "text-slate-500" : "text-white/50"}>{t('leaderboard.noOnePlayedYet')}</p>
            <p className={`text-sm mt-1 ${lightMode ? "text-slate-400" : "text-white/30"}`}>{t('leaderboard.beTheFirst')}</p>
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

                    {/* Shine animation for 1st place */}
                    {entry.rank === 1 && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{ 
                          duration: 2,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
                      />
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
                        entry.rank <= 3 ? "" : (lightMode ? "bg-slate-200/80" : "bg-white/10")
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
                        {isCurrentUser && ` (${t('leaderboard.you')})`}
                      </p>
                      <p className={`text-xs ${lightMode ? "text-slate-500" : "text-white/50"}`}>
                        {t('leaderboard.level')} {entry.levels_completed}
                      </p>
                    </div>

                    {/* Stars - with proper contrast for all ranks */}
                    <motion.div 
                      className="text-right flex items-center gap-1"
                      animate={hasRankChange ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <Star className={`h-4 w-4 ${
                        entry.rank <= 3 ? "text-amber-600 fill-amber-600" : "text-amber-400 fill-amber-400"
                      }`} />
                      <p className={`font-bold ${
                        entry.rank <= 3 ? "text-slate-800" :
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
                    <p className="font-semibold text-primary truncate">{t('leaderboard.you')}</p>
                    <p className={`text-xs ${lightMode ? "text-slate-500" : "text-white/50"}`}>{userRank.levels_completed} {t('leaderboard.level')}</p>
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
