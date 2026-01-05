import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard, LEAGUES } from "@/hooks/useLeagueLeaderboard";
import { LeagueBadgeRow } from "@/components/leaderboard/LeagueBadgeRow";
import { LeagueInfoCard } from "@/components/leaderboard/LeagueInfoCard";
import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { LeagueLockedOverlay } from "@/components/leaderboard/LeagueLockedOverlay";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

export default function Leaderboards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewingTier, setViewingTier] = useState<number | undefined>(undefined);
  
  const {
    leaderboard,
    isLoading,
    userTier,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    daysLeft,
    isLeagueLocked,
  } = useLeagueLeaderboard(viewingTier);

  const handleSelectTier = (tier: number) => {
    setViewingTier(tier);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50"
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
          <h1 className="text-lg font-semibold text-foreground">ლიდერბორდი</h1>
          <div className="w-10" />
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-24 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* League Badges Row */}
            <LeagueBadgeRow 
              currentTier={viewingTier ?? userTier} 
              userTier={userTier}
              onSelectTier={handleSelectTier}
            />

            {/* League Info Card */}
            <LeagueInfoCard
              league={currentLeague}
              daysLeft={daysLeft}
              rankChange={rankChange}
              isLocked={isLeagueLocked}
            />

            {/* Leaderboard List */}
            <div className="mt-6 px-4 space-y-1 relative">
              {/* Divider */}
              <div className="border-t border-border/50 mb-4" />
              
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  const shouldAnimate = isCurrentUser && previousRank !== null && !isLeagueLocked;

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
                </motion.div>
              )}

              {/* Locked Overlay for higher tiers */}
              {isLeagueLocked && (
                <LeagueLockedOverlay 
                  league={currentLeague} 
                  userTier={userTier} 
                />
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
