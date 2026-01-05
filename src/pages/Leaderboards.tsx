import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard } from "@/hooks/useLeagueLeaderboard";
import { LeagueBadgeRow } from "@/components/leaderboard/LeagueBadgeRow";
import { LeagueInfoCard } from "@/components/leaderboard/LeagueInfoCard";
import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

export default function Leaderboards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    leaderboard,
    isLoading,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    daysLeft,
  } = useLeagueLeaderboard();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">ლიგა</h1>
          <div className="w-10" />
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* League Badges Row */}
            <LeagueBadgeRow currentTier={currentLeague.tier} />

            {/* League Info Card */}
            <LeagueInfoCard
              league={currentLeague}
              daysLeft={daysLeft}
              rankChange={rankChange}
            />

            {/* Leaderboard List */}
            <div className="mt-6 px-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  const shouldAnimate = isCurrentUser && previousRank !== null;

                  return (
                    <LeaguePlayerRow
                      key={entry.user_id}
                      entry={entry}
                      isCurrentUser={isCurrentUser}
                      index={index}
                      previousRank={previousRank}
                      shouldAnimate={shouldAnimate}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Empty state */}
              {leaderboard.length === 0 && (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-muted-foreground">
                    ჯერ არავინ არ არის ამ ლიგაში
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    იყავი პირველი!
                  </p>
                </motion.div>
              )}

              {/* Show user's position if not in top 50 */}
              {user && !userEntry && leaderboard.length > 0 && (
                <motion.div
                  className="mt-4 pt-4 border-t border-border/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-center text-sm text-muted-foreground mb-2">
                    შენი პოზიცია
                  </p>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                    <div className="w-8 flex justify-center">
                      <span className="text-muted-foreground font-medium">—</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">შენ</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground">0</span>
                      <span className="text-muted-foreground text-sm ml-1">XP</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}
